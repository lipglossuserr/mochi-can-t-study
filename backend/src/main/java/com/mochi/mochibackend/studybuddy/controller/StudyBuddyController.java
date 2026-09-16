package com.mochi.mochibackend.studybuddy.controller;

import com.mochi.mochibackend.dto.ApiResponse;
import com.mochi.mochibackend.exception.InvalidFirebaseTokenException;
import com.mochi.mochibackend.security.FirebaseAuthenticationToken;
import com.mochi.mochibackend.studybuddy.dto.JoinStudyBuddyQueueRequest;
import com.mochi.mochibackend.studybuddy.dto.ReportStudyBuddyRoomRequest;
import com.mochi.mochibackend.studybuddy.dto.StudyBuddyStatusResponse;
import com.mochi.mochibackend.studybuddy.entity.StudyBuddyEntry;
import com.mochi.mochibackend.studybuddy.service.StudyBuddyService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Study buddy matching (algorithmic pairing for Co-Study Rooms — see
 * StudyBuddyMatchingService's doc comment for the keyword-overlap
 * algorithm itself, and StudyBuddyEntry's for why the queue lives in
 * MySQL while the resulting room still lives in Firestore like every
 * other Co-Study Room).
 * <p>
 * The client is expected to poll {@code GET /queue} every few seconds
 * while WAITING — there's no push/websocket channel for this, same
 * REST-polling-for-MySQL-state-vs-Firestore-realtime-for-room-state
 * split the rest of Study Rooms already draws (see CoStudyRoomRepository).
 */
@RestController
@RequestMapping("/api/study-buddy")
public class StudyBuddyController {

    private final StudyBuddyService studyBuddyService;

    public StudyBuddyController(StudyBuddyService studyBuddyService) {
        this.studyBuddyService = studyBuddyService;
    }

    @PostMapping("/queue")
    public ResponseEntity<ApiResponse<StudyBuddyStatusResponse>> joinQueue(
            @Valid @RequestBody JoinStudyBuddyQueueRequest request) {
        StudyBuddyEntry entry = studyBuddyService.joinQueue(currentUid(), request.getSubject());
        return ResponseEntity.ok(ApiResponse.success("Joined the study buddy queue", toResponse(entry)));
    }

    @GetMapping("/queue")
    public ResponseEntity<ApiResponse<StudyBuddyStatusResponse>> getStatus() {
        StudyBuddyEntry entry = studyBuddyService.getStatus(currentUid());
        return ResponseEntity.ok(ApiResponse.success("Study buddy queue status", toResponse(entry)));
    }

    @DeleteMapping("/queue")
    public ResponseEntity<ApiResponse<Void>> leaveQueue() {
        studyBuddyService.leaveQueue(currentUid());
        return ResponseEntity.ok(ApiResponse.success("Left the study buddy queue", null));
    }

    /** See StudyBuddyEntry's class doc for why this hand-off exists instead of the backend creating the Firestore room itself. */
    @PostMapping("/queue/room")
    public ResponseEntity<ApiResponse<Void>> reportRoom(@Valid @RequestBody ReportStudyBuddyRoomRequest request) {
        studyBuddyService.reportRoom(currentUid(), request.getRoomId());
        return ResponseEntity.ok(ApiResponse.success("Room reported", null));
    }

    private StudyBuddyStatusResponse toResponse(StudyBuddyEntry entry) {
        return new StudyBuddyStatusResponse(
                entry.getStatus(), entry.getSubject(), entry.getMatchedWithUserUid(), entry.getRoomId());
    }

    /** Same pattern as PetController/StudySessionController: the uid comes from the verified Firebase token. */
    private String currentUid() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication instanceof FirebaseAuthenticationToken firebaseAuthenticationToken)) {
            throw new InvalidFirebaseTokenException("Invalid or missing Firebase token");
        }

        return firebaseAuthenticationToken.getUid();
    }
}
