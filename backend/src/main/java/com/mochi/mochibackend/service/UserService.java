package com.mochi.mochibackend.service;

import com.google.cloud.Timestamp;
import com.mochi.mochibackend.model.UserProfile;
import com.mochi.mochibackend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Manages the business logic around a user's persisted Mochi profile.
 * <p>
 * Sprint 1.5C: replaces the temporary in-memory storage
 * ({@code InMemoryUserService}) with Firestore-backed persistence via
 * {@link UserRepository}. Firestore communication itself is delegated
 * entirely to the repository — this class only decides what to do with
 * the result (create vs. update).
 */
@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Optional<UserProfile> findByUid(String uid) {
        return userRepository.findByUid(uid);
    }

    public boolean existsByUid(String uid) {
        return userRepository.findByUid(uid).isPresent();
    }

    /**
     * The core Sprint 1.5C rule for an authenticated user being received:
     * <pre>
     * IF a profile already exists for this uid: update lastLogin
     * ELSE: create a new profile
     * </pre>
     * {@code uid}, {@code email}, and {@code displayName} must already be
     * sourced from a Firebase-verified token by the caller (never from an
     * untrusted request body) — this method trusts them as given.
     */
    public UserProfile getOrCreateProfile(String uid, String email, String displayName) {
        Timestamp now = Timestamp.now();

        Optional<UserProfile> existing = userRepository.findByUid(uid);
        if (existing.isPresent()) {
            UserProfile profile = existing.get();
            profile.setLastLogin(now);
            userRepository.updateLastLogin(uid, now);
            return profile;
        }

        UserProfile profile = new UserProfile(uid, email, displayName, now, now);
        return userRepository.save(profile);
    }

}
