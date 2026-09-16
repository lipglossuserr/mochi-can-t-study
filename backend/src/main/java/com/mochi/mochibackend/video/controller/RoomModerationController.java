package com.mochi.mochibackend.video.controller;

import com.mochi.mochibackend.dto.ApiResponse;
import com.mochi.mochibackend.exception.InvalidFirebaseTokenException;
import com.mochi.mochibackend.security.FirebaseAuthenticationToken;
import com.mochi.mochibackend.video.dto.MuteParticipantRequest;
import com.mochi.mochibackend.video.dto.ReportParticipantRequest;
import com.mochi.mochibackend.video.service.RoomModerationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Moderation actions on a room's LiveKit media session — roadmap
 * §3.2's "moderation surface", the one item every phase since 3 has
 * carried as a documented gap. {@code identity} in these paths is the
 * target participant's Firebase uid, the same value used as their
 * LiveKit participant identity (see
 * {@code VideoTokenController#issueToken}). Removing and muting are
 * host-only, enforced in {@link RoomModerationService}; reporting is
 * not — any participant can report another, see
 * {@code RoomModerationService#reportParticipant}.
 * <p>
 * Kicking someone out of the room *entirely* (not just their media
 * connection) also needs their Firestore {@code participants} doc
 * deleted — that half happens on the frontend
 * (roomRepository.ts's removeParticipant), which the host-only
 * Firestore security rule now allows. This endpoint only owns the
 * LiveKit side; a client calls both.
 */
@RestController
@RequestMapping("/api/video/rooms/{roomId}/participants/{identity}")
public class RoomModerationController {

    private final RoomModerationService moderationService;

    public RoomModerationController(RoomModerationService moderationService) {
        this.moderationService = moderationService;
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> removeParticipant(
            @PathVariable String roomId,
            @PathVariable String identity
    ) {
        moderationService.removeParticipant(roomId, currentUid(), identity);
        return ResponseEntity.ok(ApiResponse.success("Participant removed", null));
    }

    @PostMapping("/mute")
    public ResponseEntity<ApiResponse<Void>> muteParticipant(
            @PathVariable String roomId,
            @PathVariable String identity,
            @Valid @RequestBody MuteParticipantRequest request
    ) {
        moderationService.muteParticipant(roomId, currentUid(), identity, request.getMuted(), request.getTrackType());
        return ResponseEntity.ok(ApiResponse.success("Participant mute updated", null));
    }

    @PostMapping("/report")
    public ResponseEntity<ApiResponse<Void>> reportParticipant(
            @PathVariable String roomId,
            @PathVariable String identity,
            @Valid @RequestBody ReportParticipantRequest request
    ) {
        moderationService.reportParticipant(roomId, currentUid(), identity, request.getReason());
        return ResponseEntity.ok(ApiResponse.success("Report recorded", null));
    }

    /** Same pattern as VideoTokenController#currentUid / StudySessionController#currentUid. */
    private String currentUid() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication instanceof FirebaseAuthenticationToken firebaseAuthenticationToken)) {
            throw new InvalidFirebaseTokenException("Invalid or missing Firebase token");
        }

        return firebaseAuthenticationToken.getUid();
    }
}
