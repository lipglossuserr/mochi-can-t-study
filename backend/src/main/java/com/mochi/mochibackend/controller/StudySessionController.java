package com.mochi.mochibackend.controller;

import com.mochi.mochibackend.dto.ApiResponse;
import com.mochi.mochibackend.dto.FocusBatchAck;
import com.mochi.mochibackend.dto.FocusBatchRequest;
import com.mochi.mochibackend.dto.FocusTimelinePointResponse;
import com.mochi.mochibackend.dto.RoomAnalyticsResponse;
import com.mochi.mochibackend.dto.RoomParticipantSessionResponse;
import com.mochi.mochibackend.dto.RoomSessionSummaryResponse;
import com.mochi.mochibackend.dto.StartSessionRequest;
import com.mochi.mochibackend.dto.StudySessionResponse;
import com.mochi.mochibackend.dto.StudySessionSummaryResponse;
import com.mochi.mochibackend.exception.InvalidFirebaseTokenException;
import com.mochi.mochibackend.mapper.StudySessionMapper;
import com.mochi.mochibackend.model.StudySession;
import com.mochi.mochibackend.security.FirebaseAuthenticationToken;
import com.mochi.mochibackend.service.FocusAggregationService;
import com.mochi.mochibackend.service.StudySessionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.OptionalDouble;

/**
 * The {@code /api/study-sessions} contract. Controllers only translate
 * HTTP <-> service calls; every rule (state machine, ownership, timing,
 * classification) lives in the service layer. Entities are never exposed
 * — every response goes through {@link StudySessionMapper}.
 */
@RestController
@RequestMapping("/api/study-sessions")
public class StudySessionController {

    private final StudySessionService studySessionService;
    private final FocusAggregationService focusAggregationService;
    private final StudySessionMapper mapper;

    public StudySessionController(StudySessionService studySessionService,
                                  FocusAggregationService focusAggregationService,
                                  StudySessionMapper mapper) {
        this.studySessionService = studySessionService;
        this.focusAggregationService = focusAggregationService;
        this.mapper = mapper;
    }

    @PostMapping("/start")
    public ResponseEntity<ApiResponse<StudySessionResponse>> start(
            @Valid @RequestBody StartSessionRequest request) {
        String uid = currentUid();
        StudySessionResponse response = mapper.toResponse(studySessionService.start(uid, request));
        return ResponseEntity.ok(ApiResponse.success("Study session started", response));
    }

    @PostMapping("/{id}/pause")
    public ResponseEntity<ApiResponse<StudySessionResponse>> pause(@PathVariable Long id) {
        StudySessionResponse response = mapper.toResponse(studySessionService.pause(currentUid(), id));
        return ResponseEntity.ok(ApiResponse.success("Study session paused", response));
    }

    @PostMapping("/{id}/resume")
    public ResponseEntity<ApiResponse<StudySessionResponse>> resume(@PathVariable Long id) {
        StudySessionResponse response = mapper.toResponse(studySessionService.resume(currentUid(), id));
        return ResponseEntity.ok(ApiResponse.success("Study session resumed", response));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<StudySessionResponse>> complete(@PathVariable Long id) {
        StudySessionResponse response = mapper.toResponse(studySessionService.complete(currentUid(), id));
        return ResponseEntity.ok(ApiResponse.success("Study session completed", response));
    }

    @PostMapping("/{id}/stop")
    public ResponseEntity<ApiResponse<StudySessionResponse>> stop(@PathVariable Long id) {
        StudySessionResponse response = mapper.toResponse(studySessionService.stop(currentUid(), id));
        return ResponseEntity.ok(ApiResponse.success("Study session stopped", response));
    }

    @PostMapping("/{id}/focus-batches")
    public ResponseEntity<ApiResponse<FocusBatchAck>> submitFocusBatch(
            @PathVariable Long id,
            @Valid @RequestBody FocusBatchRequest request) {
        FocusBatchAck ack = focusAggregationService.recordBatch(currentUid(), id, request);
        String message = ack.isDuplicate() ? "Duplicate focus batch ignored" : "Focus batch recorded";
        return ResponseEntity.ok(ApiResponse.success(message, ack));
    }

    /** Refresh recovery: the client calls this on page load to restore a live timer. */
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<StudySessionResponse>> active() {
        return studySessionService.findActive(currentUid())
                .map(session -> ResponseEntity.ok(
                        ApiResponse.success("Active study session found", mapper.toResponse(session))))
                .orElseGet(() -> ResponseEntity.ok(
                        ApiResponse.success("No active study session", null)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StudySessionResponse>> getById(@PathVariable Long id) {
        StudySessionResponse response = mapper.toResponse(studySessionService.getOwned(currentUid(), id));
        return ResponseEntity.ok(ApiResponse.success("Study session", response));
    }

    /** Session focus timeline graph — powers the focus dip/recover chart on the session summary. */
    @GetMapping("/{id}/focus-timeline")
    public ResponseEntity<ApiResponse<List<FocusTimelinePointResponse>>> getFocusTimeline(@PathVariable Long id) {
        List<FocusTimelinePointResponse> points = studySessionService.getFocusTimeline(currentUid(), id)
                .stream()
                .map(mapper::toTimelinePoint)
                .toList();
        return ResponseEntity.ok(ApiResponse.success("Session focus timeline", points));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<StudySessionSummaryResponse>>> mySessions() {
        List<StudySessionSummaryResponse> sessions = studySessionService.findAllForUser(currentUid())
                .stream()
                .map(mapper::toSummary)
                .toList();
        return ResponseEntity.ok(ApiResponse.success("Your study sessions", sessions));
    }

    /**
     * Aggregated recap for a co-study room — Study Rooms Phase 2. Any
     * authenticated user may request it (see
     * {@link StudySessionService#findAllForRoom} javadoc for why this
     * is intentionally not restricted to current room members); an
     * unknown or never-linked roomId simply yields an empty summary
     * rather than a 404, since "no sessions started yet" is a normal,
     * expected state for a room whose timer hasn't run.
     */
    @GetMapping("/room/{roomId}/summary")
    public ResponseEntity<ApiResponse<RoomSessionSummaryResponse>> roomSummary(@PathVariable String roomId) {
        List<StudySession> sessions = studySessionService.findAllForRoom(roomId);

        List<RoomParticipantSessionResponse> participants = sessions.stream()
                .map(mapper::toRoomParticipant)
                .toList();

        long totalStudySeconds = sessions.stream()
                .mapToLong(StudySession::getAccumulatedStudySeconds)
                .sum();

        OptionalDouble averageFocus = sessions.stream()
                .map(StudySession::getFocusScore)
                .filter(java.util.Objects::nonNull)
                .mapToInt(Integer::intValue)
                .average();

        RoomSessionSummaryResponse response = new RoomSessionSummaryResponse(
                roomId,
                participants.size(),
                totalStudySeconds,
                averageFocus.isPresent() ? averageFocus.getAsDouble() : null,
                participants
        );

        return ResponseEntity.ok(ApiResponse.success("Room session summary", response));
    }

    /**
     * Study Rooms Phase 5 (roadmap §6) — the caller's own room-study
     * history, aggregated. Always the authenticated user's own data;
     * there's no path/query parameter for whose analytics to fetch,
     * unlike the room summary above which is intentionally
     * cross-user.
     */
    @GetMapping("/room-analytics")
    public ResponseEntity<ApiResponse<RoomAnalyticsResponse>> roomAnalytics() {
        RoomAnalyticsResponse response = studySessionService.getRoomAnalytics(currentUid());
        return ResponseEntity.ok(ApiResponse.success("Room analytics", response));
    }

    /**
     * Study Rooms "all must finish" policy. Host-only (enforced inside
     * {@link StudySessionService#voidRoomSessions}, the same way
     * remove/mute are host-only in RoomModerationController) — any
     * other caller gets {@code NotRoomHostException}, mapped to 403 by
     * the global exception handler like every other host-only action
     * in this codebase.
     */
    @PostMapping("/room/{roomId}/void")
    public ResponseEntity<ApiResponse<List<StudySessionResponse>>> voidRoomSessions(
            @PathVariable String roomId) {
        List<StudySessionResponse> responses = studySessionService.voidRoomSessions(roomId, currentUid())
                .stream()
                .map(mapper::toResponse)
                .toList();
        return ResponseEntity.ok(ApiResponse.success("Room sessions voided — no rewards granted", responses));
    }

    /**
     * Same pattern as AuthController: the uid comes from the verified
     * Firebase token in the security context. With SecurityConfig now
     * requiring authentication on /api/study-sessions/**, this is a
     * defensive second check.
     */
    private String currentUid() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication instanceof FirebaseAuthenticationToken firebaseAuthenticationToken)) {
            throw new InvalidFirebaseTokenException("Invalid or missing Firebase token");
        }

        return firebaseAuthenticationToken.getUid();
    }
}
