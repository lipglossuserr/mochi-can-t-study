package com.mochi.mochibackend.service;

import com.mochi.mochibackend.dto.UserResponse;
import com.mochi.mochibackend.exception.UserNotFoundException;
import com.mochi.mochibackend.model.UserProfile;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Orchestrates what happens once Firebase has already authenticated a
 * caller. Contains no authentication logic and never handles a password
 * — it only maps a verified Firebase identity (uid, email, displayName)
 * onto the backend's persisted {@link UserProfile} via {@link UserService}.
 */
@Service
public class AuthService {

    private final UserService userService;

    public AuthService(UserService userService) {
        this.userService = userService;
    }

    /**
     * Returns the existing profile for this uid (bumping lastLogin), or
     * provisions a new one if this is the caller's first successful
     * registration call. Never creates a duplicate for a uid that already
     * has a profile.
     */
    public UserResponse registerOrGetUser(String uid, String email, String displayName) {
        UserProfile profile = userService.getOrCreateProfile(uid, email, displayName);
        return toUserResponse(profile);
    }

    /**
     * Returns the profile for an already-provisioned user. Throws if the
     * caller is authenticated by Firebase but has no backend profile yet
     * (i.e. never called register).
     */
    public UserResponse getCurrentUser(String uid) {
        UserProfile profile = userService.findByUid(uid)
                .orElseThrow(() -> new UserNotFoundException("Authenticated user not found"));

        return toUserResponse(profile);
    }

    private UserResponse toUserResponse(UserProfile profile) {
        Instant createdAt = profile.getCreatedAt() == null
                ? null
                : Instant.ofEpochSecond(profile.getCreatedAt().getSeconds(), profile.getCreatedAt().getNanos());

        return new UserResponse(profile.getUid(), profile.getDisplayName(), profile.getEmail(), createdAt);
    }

}
