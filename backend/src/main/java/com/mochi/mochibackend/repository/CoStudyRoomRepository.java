package com.mochi.mochibackend.repository;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.mochi.mochibackend.exception.FirestoreOperationException;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.concurrent.ExecutionException;

/**
 * Read-only backend access to the {@code rooms} Firestore collection —
 * Study Rooms moderation surface. Every other co-study room concern
 * (create/join/chat/presence/timer) stays entirely on the frontend per
 * the Phase 0 architecture decision ("Firestore owns realtime truth");
 * this is a narrow, deliberate exception: moderation endpoints
 * (RoomModerationController) need to verify a caller is actually the
 * room's host before letting them remove or mute someone, and that
 * check has to happen server-side — trusting a client-supplied
 * "I'm the host" flag would let anyone kick anyone. Same
 * Firestore-Admin-via-existing-bean pattern as {@link UserRepository}.
 * <p>
 * Not named {@code RoomRepository} to avoid any confusion with the
 * pet's decorable home room ({@code roomlayout} package) — a
 * completely different "room" concept in this codebase.
 */
@Repository
public class CoStudyRoomRepository {

    private static final String COLLECTION = "rooms";

    private final Firestore firestore;

    public CoStudyRoomRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    /** Empty if the room doesn't exist at all — distinct from "exists but the field is missing," which shouldn't happen for a well-formed room doc but is treated the same (no host = no one is authorized). */
    public Optional<String> findHostUserId(String roomId) {
        try {
            DocumentSnapshot snapshot = firestore.collection(COLLECTION).document(roomId).get().get();
            if (!snapshot.exists()) {
                return Optional.empty();
            }
            return Optional.ofNullable(snapshot.getString("hostUserId"));
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new FirestoreOperationException("Interrupted while reading co-study room: " + roomId, ex);
        } catch (ExecutionException ex) {
            throw new FirestoreOperationException("Failed to read co-study room: " + roomId, ex);
        }
    }
}
