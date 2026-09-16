package com.mochi.mochibackend.community.repository;

import com.mochi.mochibackend.community.entity.CommunityMembership;
import com.mochi.mochibackend.community.enums.MembershipRole;
import com.mochi.mochibackend.community.enums.MembershipStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CommunityMembershipRepository extends JpaRepository<CommunityMembership, Long> {

    Optional<CommunityMembership> findByCommunityIdAndUserUid(Long communityId, String userUid);

    /** Every community a user has any relationship with (pending, approved, or rejected) — used to build the discover feed. */
    List<CommunityMembership> findAllByUserUid(String userUid);

    List<CommunityMembership> findAllByCommunityIdAndStatusOrderByCreatedAtAsc(Long communityId, MembershipStatus status);

    long countByCommunityIdAndRoleAndStatus(Long communityId, MembershipRole role, MembershipStatus status);
}
