package com.mochi.mochibackend.video.controller;

import com.mochi.mochibackend.dto.ApiResponse;
import com.mochi.mochibackend.exception.InvalidFirebaseTokenException;
import com.mochi.mochibackend.security.FirebaseAuthenticationToken;
import com.mochi.mochibackend.video.dto.VideoTokenRequest;
import com.mochi.mochibackend.video.dto.VideoTokenResponse;
import com.mochi.mochibackend.video.service.LiveKitRoomNaming;
import com.mochi.mochibackend.video.service.LiveKitTokenService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The {@code /api/video} contract — Study Rooms Phase 3. Issues
 * short-lived LiveKit access tokens scoped to one room and one
 * participant identity (the caller's Firebase uid). This is the *only*
 * new backend surface video needs: LiveKit's SFU handles the actual
 * media routing directly between each client and LiveKit's servers —
 * this backend never touches a video/audio frame, same "don't build
 * your own SFU" boundary the roadmap calls for.
 * <p>
 * Deliberately not room-membership-gated (same trust boundary as
 * {@code StudySessionController#roomSummary} — any authenticated user
 * can request a token for any room id). Firestore rules already gate
 * *joining* the co-study room itself; a LiveKit token for a room nobody
 * else is in just wastes a connection, it doesn't leak anything.
 */
@RestController
@RequestMapping("/api/video")
public class VideoTokenController {

    private final LiveKitTokenService tokenService;

    public VideoTokenController(LiveKitTokenService tokenService) {
        this.tokenService = tokenService;
    }

    @PostMapping("/rooms/{roomId}/token")
    public ResponseEntity<ApiResponse<VideoTokenResponse>> issueToken(
            @PathVariable String roomId,
            @Valid @RequestBody(required = false) VideoTokenRequest request) {

        String uid = currentUid();
        String displayName = (request != null && request.getDisplayName() != null && !request.getDisplayName().isBlank())
                ? request.getDisplayName()
                : uid;

        String liveKitRoomName = LiveKitRoomNaming.toLiveKitRoomName(roomId);
        String token = tokenService.createJoinToken(liveKitRoomName, uid, displayName);

        VideoTokenResponse response = new VideoTokenResponse(token, tokenService.getWsUrl(), liveKitRoomName);
        return ResponseEntity.ok(ApiResponse.success("Video token issued", response));
    }

    /** Same pattern as StudySessionController#currentUid. */
    private String currentUid() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication instanceof FirebaseAuthenticationToken firebaseAuthenticationToken)) {
            throw new InvalidFirebaseTokenException("Invalid or missing Firebase token");
        }

        return firebaseAuthenticationToken.getUid();
    }
}
