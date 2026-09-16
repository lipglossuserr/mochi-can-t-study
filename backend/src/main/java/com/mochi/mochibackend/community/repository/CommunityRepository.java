package com.mochi.mochibackend.community.repository;

import com.mochi.mochibackend.community.entity.Community;
import com.mochi.mochibackend.community.enums.CommunityVisibility;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface CommunityRepository extends JpaRepository<Community, Long> {

    Optional<Community> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Community> findAllByVisibilityOrderByMemberCountDescNameAsc(CommunityVisibility visibility);

    /**
     * v2 backlog: counter reconciliation — corrects any {@code member_count}
     * that's drifted from the actual count of APPROVED memberships,
     * in one bulk statement rather than looping row-by-row in Java. See
     * {@code CounterReconciliationService}'s javadoc for why this exists
     * and how often it runs. The WHERE clause means only genuinely
     * drifted rows are touched — a healthy table with zero drift issues
     * zero writes.
     */
    @Modifying(clearAutomatically = true)
    @Query(value = "UPDATE communities c "
            + "SET member_count = (SELECT COUNT(*) FROM community_memberships m WHERE m.community_id = c.id AND m.status = 'APPROVED') "
            + "WHERE member_count <> (SELECT COUNT(*) FROM community_memberships m WHERE m.community_id = c.id AND m.status = 'APPROVED')",
            nativeQuery = true)
    int reconcileMemberCounts();
}
