package com.mochi.mochibackend.leaderboard.controller;

import com.mochi.mochibackend.dto.ApiResponse;
import com.mochi.mochibackend.exception.InvalidFirebaseTokenException;
import com.mochi.mochibackend.leaderboard.dto.LeaderboardResponse;
import com.mochi.mochibackend.leaderboard.service.LeaderboardService;
import com.mochi.mochibackend.security.FirebaseAuthenticationToken;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The {@code /api/leaderboard} contract. Read-only — ranking is derived
 * live from {@code pets} on every call rather than a separately
 * maintained/cached table, since the underlying data (level, xp) is
 * small and already indexed by primary lookups elsewhere. The uid
 * always comes from the verified Firebase token, same pattern as
 * {@code PetController}/{@code AchievementController}.
 */
@RestController
@RequestMapping("/api/leaderboard")
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    public LeaderboardController(LeaderboardService leaderboardService) {
        this.leaderboardService = leaderboardService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<LeaderboardResponse>> getLeaderboard() {
        LeaderboardResponse response = leaderboardService.getLeaderboard(currentUid());
        return ResponseEntity.ok(ApiResponse.success("Leaderboard retrieved", response));
    }

    /** Same pattern as PetController/AchievementController: the uid comes from the verified Firebase token. */
    private String currentUid() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication instanceof FirebaseAuthenticationToken firebaseAuthenticationToken)) {
            throw new InvalidFirebaseTokenException("Invalid or missing Firebase token");
        }

        return firebaseAuthenticationToken.getUid();
    }
}
