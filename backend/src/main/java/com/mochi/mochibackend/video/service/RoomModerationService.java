package com.mochi.mochibackend.video.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mochi.mochibackend.exception.CoStudyRoomNotFoundException;
import com.mochi.mochibackend.exception.InvalidModerationReportException;
import com.mochi.mochibackend.exception.LiveKitAdminCallException;
import com.mochi.mochibackend.exception.NotRoomHostException;
import com.mochi.mochibackend.repository.CoStudyRoomRepository;
import com.mochi.mochibackend.video.entity.RoomModerationLogEntry;
import com.mochi.mochibackend.video.enums.RoomModerationAction;
import com.mochi.mochibackend.video.enums.TrackType;
import com.mochi.mochibackend.video.repository.RoomModerationLogRepository;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Moderation actions for a co-study room — roadmap §3.2's "moderation
 * surface", carried as a documented gap through Phases 3–5 until now.
 * Most of what's here ({@code removeParticipant}, {@code muteParticipant})
 * is host-only and talks to LiveKit; {@link #reportParticipant} is the
 * exception — any participant can report, and it never touches LiveKit
 * at all, only the audit log (see its own javadoc).
 * <p>
 * Talks to LiveKit's Room Service Twirp API directly over HTTP
 * ({@code POST /twirp/livekit.RoomService/<Method>}), the same
 * "hand-roll the small stable spec instead of adding the
 * livekit-server-sdk dependency" call {@link LiveKitTokenService}
 * already made for token issuance — see that class's javadoc for the
 * full reasoning. LiveKit's Twirp JSON endpoints accept either
 * snake_case or camelCase body keys; snake_case is used here to match
 * the field names in LiveKit's own protobuf/Go source.
 * <p>
 * {@code removeParticipant}/{@code muteParticipant} re-verify the
 * caller is the room's current host via {@link CoStudyRoomRepository}
 * on every call — host status can change (Study Rooms Phase 4's
 * host-transfer-on-disconnect), so this is never cached across calls.
 * <p>
 * Every action that reaches LiveKit successfully is also written to
 * {@link RoomModerationLogRepository} — see
 * {@code RoomModerationLogEntry}'s class doc. Logged only after the
 * Twirp call succeeds, deliberately: a failed mute never happened, so
 * it shouldn't appear in a room's history as though it did.
 */
@Service
public class RoomModerationService {

    private final LiveKitTokenService tokenService;
    private final CoStudyRoomRepository coStudyRoomRepository;
    private final RoomModerationLogRepository moderationLogRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public RoomModerationService(
            LiveKitTokenService tokenService,
            CoStudyRoomRepository coStudyRoomRepository,
            RoomModerationLogRepository moderationLogRepository,
            ObjectMapper objectMapper
    ) {
        this.tokenService = tokenService;
        this.coStudyRoomRepository = coStudyRoomRepository;
        this.moderationLogRepository = moderationLogRepository;
        this.objectMapper = objectMapper;
    }

    /** Disconnects a participant from the room's LiveKit media session immediately (they can still re-join unless also removed from the Firestore room — see roomRepository.ts's removeParticipant on the frontend, which handles that half). */
    public void removeParticipant(String roomId, String callerUid, String targetIdentity) {
        String liveKitRoomName = assertIsHostAndGetLiveKitRoomName(roomId, callerUid);
        callTwirp(liveKitRoomName, "RemoveParticipant", Map.of(
                "room", liveKitRoomName,
                "identity", targetIdentity
        ));
        logAction(roomId, callerUid, targetIdentity, RoomModerationAction.REMOVE, null, null);
    }

    /**
     * Force-mutes (or unmutes) every track of the given {@code trackType}
     * a participant has published — {@code AUDIO} for the original
     * "quiet down" action, {@code VIDEO} for the "turn off camera" one.
     * Requires a ListParticipants call first to discover the target's
     * current track sids; LiveKit's mute endpoint needs a specific
     * track, not just an identity.
     */
    public void muteParticipant(
            String roomId, String callerUid, String targetIdentity, boolean muted, TrackType trackType) {
        String liveKitRoomName = assertIsHostAndGetLiveKitRoomName(roomId, callerUid);

        JsonNode result = callTwirp(liveKitRoomName, "ListParticipants", Map.of("room", liveKitRoomName));
        boolean matchedAnyTrack = false;
        for (JsonNode participant : result.path("participants")) {
            if (!targetIdentity.equals(participant.path("identity").asText())) {
                continue;
            }
            for (JsonNode track : participant.path("tracks")) {
                String liveKitTrackType = track.path("type").asText("");
                String trackSid = track.path("sid").asText(null);
                if (trackSid == null || !trackType.name().equalsIgnoreCase(liveKitTrackType)) {
                    continue;
                }
                Map<String, Object> body = new LinkedHashMap<>();
                body.put("room", liveKitRoomName);
                body.put("identity", targetIdentity);
                body.put("track_sid", trackSid);
                body.put("muted", muted);
                callTwirp(liveKitRoomName, "MutePublishedTrack", body);
                matchedAnyTrack = true;
            }
        }

        // One log row per moderation action, not per track — a
        // participant with two tracks of the same type muted in the
        // same call is one event in the room's history, not two.
        // Nothing to log if the target had no track of this type to
        // mute in the first place (e.g. audio-muting someone with no
        // camera on): no LiveKit call was actually made, so there's no
        // action to record — same "only log what really happened" rule
        // removeParticipant's success-only logging follows above.
        if (matchedAnyTrack) {
            RoomModerationAction action = muted ? RoomModerationAction.MUTE : RoomModerationAction.UNMUTE;
            logAction(roomId, callerUid, targetIdentity, action, trackType, null);
        }
    }

    /**
     * Durably records a participant report — no LiveKit call, and
     * deliberately not host-gated (see {@link RoomModerationAction}'s
     * class doc: any participant can report another, not just the
     * host). This is a second write alongside the existing Firestore
     * one the client already makes (see {@code ReportParticipantRequest}'s
     * javadoc); this method doesn't read, dedupe against, or replace
     * that write.
     * <p>
     * Still confirms the room exists, the same way every other method
     * here does — a report against a made-up room id isn't worth a row
     * — but doesn't check {@code reporterUid} against the room's host,
     * since reporting isn't a host privilege.
     */
    public void reportParticipant(String roomId, String reporterUid, String targetIdentity, String reason) {
        if (reporterUid.equals(targetIdentity)) {
            throw new InvalidModerationReportException("You can't report yourself.");
        }
        if (coStudyRoomRepository.findHostUserId(roomId).isEmpty()) {
            throw new CoStudyRoomNotFoundException("Room not found: " + roomId);
        }

        logAction(roomId, reporterUid, targetIdentity, RoomModerationAction.REPORT, null, reason);
    }

    /**
     * A room's full moderation timeline, most recent first — host-only,
     * same authorization rule {@code removeParticipant}/
     * {@code muteParticipant} use, even though nothing here talks to
     * LiveKit (viewing the log is still a host privilege, unlike
     * filing a report).
     */
    public List<RoomModerationLogEntry> getModerationLog(String roomId, String callerUid) {
        assertIsHost(roomId, callerUid);
        return moderationLogRepository.findByRoomIdOrderByCreatedAtDesc(roomId);
    }

    /** Shared by every action above. */
    private void logAction(
            String roomId,
            String actorUid,
            String targetUid,
            RoomModerationAction action,
            TrackType trackType,
            String reason
    ) {
        RoomModerationLogEntry entry = new RoomModerationLogEntry();
        entry.setRoomId(roomId);
        entry.setActorUid(actorUid);
        entry.setTargetUid(targetUid);
        entry.setAction(action);
        entry.setTrackType(trackType);
        entry.setReason(reason);
        moderationLogRepository.save(entry);
    }

    private String assertIsHostAndGetLiveKitRoomName(String roomId, String callerUid) {
        assertIsHost(roomId, callerUid);
        return LiveKitRoomNaming.toLiveKitRoomName(roomId);
    }

    private void assertIsHost(String roomId, String callerUid) {
        String hostUserId = coStudyRoomRepository.findHostUserId(roomId)
                .orElseThrow(() -> new CoStudyRoomNotFoundException("Room not found: " + roomId));

        if (!hostUserId.equals(callerUid)) {
            throw new NotRoomHostException("Only the room's host can do that.");
        }
    }

    private JsonNode callTwirp(String liveKitRoomName, String method, Map<String, Object> body) {
        try {
            String adminToken = tokenService.createAdminToken(liveKitRoomName);
            String requestBody = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(tokenService.getHttpUrl() + "/twirp/livekit.RoomService/" + method))
                    .timeout(Duration.ofSeconds(8))
                    .header("Authorization", "Bearer " + adminToken)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300) {
                throw new LiveKitAdminCallException(
                        "LiveKit " + method + " failed: HTTP " + response.statusCode() + " — " + response.body());
            }

            String responseBody = response.body();
            return objectMapper.readTree(responseBody == null || responseBody.isBlank() ? "{}" : responseBody);
        } catch (IOException ex) {
            throw new LiveKitAdminCallException("Failed to reach LiveKit for " + method, ex);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new LiveKitAdminCallException("Interrupted while calling LiveKit " + method, ex);
        }
    }
}
