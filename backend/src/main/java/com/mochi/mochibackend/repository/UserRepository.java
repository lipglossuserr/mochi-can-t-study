package com.mochi.mochibackend.repository;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.FieldPath;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.mochi.mochibackend.exception.FirestoreOperationException;
import com.mochi.mochibackend.model.UserProfile;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

/**
 * Firestore persistence for {@link UserProfile} documents.
 * <p>
 * Talks to Firestore only — no business logic (existence checks,
 * create-vs-update decisions) lives here; that belongs to
 * {@code UserService}. Documents live in the {@code users} collection,
 * keyed by Firebase UID.
 */
@Repository
public class UserRepository {

    private static final String COLLECTION = "users";

    private final Firestore firestore;

    public UserRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    /**
     * Retrieves the profile for a given Firebase UID, if one exists.
     */
    public Optional<UserProfile> findByUid(String uid) {
        try {
            DocumentSnapshot snapshot = collection().document(uid).get().get();
            return snapshot.exists() ? Optional.ofNullable(snapshot.toObject(UserProfile.class)) : Optional.empty();
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new FirestoreOperationException("Interrupted while reading user profile: " + uid, ex);
        } catch (ExecutionException ex) {
            throw new FirestoreOperationException("Failed to read user profile: " + uid, ex);
        }
    }

    /**
     * Writes a full profile document, creating it if it doesn't exist yet
     * or overwriting it entirely if it does.
     */
    public UserProfile save(UserProfile profile) {
        try {
            collection().document(profile.getUid()).set(profile).get();
            return profile;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new FirestoreOperationException("Interrupted while saving user profile: " + profile.getUid(), ex);
        } catch (ExecutionException ex) {
            throw new FirestoreOperationException("Failed to save user profile: " + profile.getUid(), ex);
        }
    }

    /**
     * Updates only the {@code lastLogin} field of an existing document,
     * leaving every other field untouched.
     */
    public void updateLastLogin(String uid, Timestamp lastLogin) {
        try {
            collection().document(uid).update("lastLogin", lastLogin).get();
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new FirestoreOperationException("Interrupted while updating lastLogin for: " + uid, ex);
        } catch (ExecutionException ex) {
            throw new FirestoreOperationException("Failed to update lastLogin for: " + uid, ex);
        }
    }

    /**
     * Batch-fetches profiles for a set of uids in a single round trip
     * (used by the leaderboard, which otherwise only ever looks up one
     * uid at a time). Firestore's {@code whereIn} caps out at 30 values —
     * fine for a top-10 leaderboard plus the caller's own entry, but not
     * meant for arbitrary-size lookups. Missing uids are simply absent
     * from the result rather than causing an error.
     */
    public List<UserProfile> findAllByUids(List<String> uids) {
        if (uids.isEmpty()) {
            return List.of();
        }

        try {
            return firestore.collection(COLLECTION)
                    .whereIn(FieldPath.documentId(), uids)
                    .get()
                    .get()
                    .getDocuments()
                    .stream()
                    .map((QueryDocumentSnapshot doc) -> doc.toObject(UserProfile.class))
                    .toList();
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new FirestoreOperationException("Interrupted while batch-reading user profiles", ex);
        } catch (ExecutionException ex) {
            throw new FirestoreOperationException("Failed to batch-read user profiles", ex);
        }
    }

    private CollectionReference collection() {
        return firestore.collection(COLLECTION);
    }

}
