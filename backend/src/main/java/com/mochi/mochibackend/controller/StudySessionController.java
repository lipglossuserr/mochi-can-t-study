package com.mochi.mochibackend.controller;

import com.mochi.mochibackend.dto.ApiResponse;
import com.mochi.mochibackend.dto.FocusBatchAck;
import com.mochi.mochibackend.dto.FocusBatchRequest;
import com.mochi.mochibackend.dto.StartSessionRequest;
import com.mochi.mochibackend.dto.StudySessionResponse;
import com.mochi.mochibackend.dto.StudySessionSummaryResponse;
import com.mochi.mochibackend.exception.InvalidFirebaseTokenException;
import com.mochi.mochibackend.mapper.StudySessionMapper;
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

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<StudySessionSummaryResponse>>> mySessions() {
        List<StudySessionSummaryResponse> sessions = studySessionService.findAllForUser(currentUid())
                .stream()
                .map(mapper::toSummary)
                .toList();
        return ResponseEntity.ok(ApiResponse.success("Your study sessions", sessions));
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
