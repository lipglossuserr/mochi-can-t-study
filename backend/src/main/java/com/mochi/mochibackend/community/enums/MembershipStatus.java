package com.mochi.mochibackend.community.enums;

/**
 * Lifecycle of one (community, user) membership row.
 * <p>
 * PENDING: a join request awaiting a moderator/admin decision (PRIVATE
 * communities only — PUBLIC joins skip straight to APPROVED).
 * APPROVED: a real member; counted in {@code Community.memberCount}.
 * REJECTED: a decided "no" — kept (not deleted) so the row can be
 * reused if the user re-requests, rather than accumulating duplicate
 * history.
 * BANNED: a moderator/admin removed this member for cause (via the
 * Phase 5 report queue's "Ban" action) — kept, not deleted, and unlike
 * REJECTED it is NOT revivable by re-requesting; {@code
 * CommunityService.join} rejects a banned user outright. Not counted
 * in {@code memberCount}.
 * <p>
 * There is no LEFT status: leaving deletes the row outright (see
 * {@code CommunityService.leave}) since a former member in good
 * standing isn't something this app needs to distinguish from someone
 * who never joined — only a banned former member needs a durable
 * record.
 */
public enum MembershipStatus {
    PENDING,
    APPROVED,
    REJECTED,
    BANNED
}
