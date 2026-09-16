package com.mochi.mochibackend.community.firestore;

import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.Firestore;
import com.mochi.mochibackend.exception.FirestoreOperationException;
import org.springframework.stereotype.Repository;

import java.time.Clock;
import java.util.concurrent.ExecutionException;

/**
 * Firestore persistence for the {@code communities/{communityId}/members/{uid}}
 * mirror documents — Community Rooms Phase 6. Same shape as
 * {@code UserRepository}: talks to Firestore only, no business logic
 * about *when* to sync (that's {@code CommunityService}'s call, at the
 * end of every membership-mutating method).
 * <p>
 * Firestore document IDs can't contain {@code /}, so {@code communityId}
 * (a {@code Long}) is safe to use directly as the parent document ID
 * under {@code communities/}.
 */
@Repository
public class CommunityMemberMirrorRepository {

    private static final String COMMUNITIES_COLLECTION = "communities";
    private static final String MEMBERS_SUBCOLLECTION = "members";

    private final Firestore firestore;
    private final Clock clock;

    public CommunityMemberMirrorRepository(Firestore firestore, Clock clock) {
        this.firestore = firestore;
        this.clock = clock;
    }

    /**
     * Writes (creates or overwrites) the mirror document for one member.
     * Called after every membership status/role change that isn't a
     * full removal — join, approve, reject, ban, changeRole.
     */
    public void upsert(Long communityId, String uid, String role, String status) {
        CommunityMemberMirror mirror = new CommunityMemberMirror(uid, role, status, clock.millis());
        try {
            membersCollection(communityId).document(uid).set(mirror).get();
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new FirestoreOperationException(
                    "Interrupted while syncing member mirror for community " + communityId + ", uid " + uid, ex);
        } catch (ExecutionException ex) {
            throw new FirestoreOperationException(
                    "Failed to sync member mirror for community " + communityId + ", uid " + uid, ex);
        }
    }

    /**
     * Removes the mirror document entirely — called only from
     * {@code CommunityService.leave}, since leaving deletes the MySQL
     * row outright rather than changing its status (unlike reject/ban,
     * which keep the row and get an {@link #upsert} instead).
     */
    public void delete(Long communityId, String uid) {
        try {
            membersCollection(communityId).document(uid).delete().get();
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new FirestoreOperationException(
                    "Interrupted while removing member mirror for community " + communityId + ", uid " + uid, ex);
        } catch (ExecutionException ex) {
            throw new FirestoreOperationException(
                    "Failed to remove member mirror for community " + communityId + ", uid " + uid, ex);
        }
    }

    private CollectionReference membersCollection(Long communityId) {
        return firestore.collection(COMMUNITIES_COLLECTION)
                .document(String.valueOf(communityId))
                .collection(MEMBERS_SUBCOLLECTION);
    }
}
