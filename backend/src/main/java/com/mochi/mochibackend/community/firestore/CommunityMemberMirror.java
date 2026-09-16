package com.mochi.mochibackend.community.firestore;

/**
 * The document shape written to {@code communities/{communityId}/members/{uid}}
 * in Firestore — Community Rooms Phase 6 (chat). This is the sync
 * mechanism the design doc calls out as the single highest-priority
 * piece of tech debt in the whole feature: Firestore Security Rules
 * authorize chat reads/writes purely off this mirrored document
 * (checking {@code status == 'APPROVED'}) rather than round-tripping to
 * Spring on every message, which means this mirror and the MySQL
 * {@code community_memberships} row it's derived from must never
 * silently diverge.
 * <p>
 * No-args constructor + public fields (not the Lombok
 * getter/setter-on-private-fields style the JPA entities use) because
 * the Firestore Admin SDK's {@code DocumentSnapshot.toObject()} needs a
 * plain bean it can populate via reflection — matching {@code UserProfile}'s
 * shape, the one other Firestore-backed model already in this codebase.
 */
public class CommunityMemberMirror {

    public String uid;
    public String role;
    public String status;
    /** Epoch millis of the write — purely for debugging/observability; Security Rules don't read this field. */
    public long updatedAtEpochMillis;

    public CommunityMemberMirror() {
        // Required by Firestore's toObject() deserialization.
    }

    public CommunityMemberMirror(String uid, String role, String status, long updatedAtEpochMillis) {
        this.uid = uid;
        this.role = role;
        this.status = status;
        this.updatedAtEpochMillis = updatedAtEpochMillis;
    }
}
