package com.mochi.mochibackend.community.enums;

/**
 * Who can join a community without approval.
 * <p>
 * PUBLIC: joining is instant — {@code CommunityService.join} creates an
 * already-APPROVED membership. PRIVATE: joining creates a PENDING
 * membership that a MODERATOR/ADMIN must approve or reject — see
 * {@link MembershipStatus}.
 */
public enum CommunityVisibility {
    PUBLIC,
    PRIVATE
}
