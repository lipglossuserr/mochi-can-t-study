package com.mochi.mochibackend.community.enums;

/**
 * A member's authority within one specific community. Deliberately
 * community-scoped rather than a global/platform role (per the
 * per-community-roles decision in the Community Rooms design doc) — a
 * user who is ADMIN of "iUT" has no special standing anywhere else.
 * <p>
 * The community's creator is granted ADMIN automatically at creation
 * time (see {@code CommunityService.create}). ADMIN and MODERATOR can
 * both approve/reject join requests; only ADMIN can currently promote
 * another member (not yet implemented — flagged as a Phase 1 follow-up).
 */
public enum MembershipRole {
    MEMBER,
    MODERATOR,
    ADMIN
}
