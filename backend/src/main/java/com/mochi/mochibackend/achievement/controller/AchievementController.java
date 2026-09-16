package com.mochi.mochibackend.achievement.controller;

import com.mochi.mochibackend.achievement.dto.AchievementResponse;
import com.mochi.mochibackend.achievement.service.AchievementService;
import com.mochi.mochibackend.dto.ApiResponse;
import com.mochi.mochibackend.exception.InvalidFirebaseTokenException;
import com.mochi.mochibackend.security.FirebaseAuthenticationToken;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The {@code /api/achievements} contract. Unlocking itself never
 * happens from a request here — it's a side effect of
 * {@code StudySessionService.complete} via {@code AchievementService}.
 * This controller only ever reads the current state of the catalog for
 * the calling user. The uid always comes from the verified Firebase
 * token, same pattern as {@code PetController}.
 */
@RestController
@RequestMapping("/api/achievements")
public class AchievementController {

    private final AchievementService achievementService;

    public AchievementController(AchievementService achievementService) {
        this.achievementService = achievementService;
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<AchievementResponse>>> getMyAchievements() {
        List<AchievementResponse> response = achievementService.listForUser(currentUid());
        return ResponseEntity.ok(ApiResponse.success("Achievements retrieved", response));
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
