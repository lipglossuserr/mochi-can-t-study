package com.mochi.mochibackend.community.mapper;

import com.mochi.mochibackend.community.dto.CommunityResponse;
import com.mochi.mochibackend.community.dto.MembershipResponse;
import com.mochi.mochibackend.community.entity.Community;
import com.mochi.mochibackend.community.entity.CommunityMembership;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Entity -> DTO mapping. Entities are never exposed from controllers.
 */
@Component
public class CommunityMapper {

    public CommunityResponse toResponse(Community community, Optional<CommunityMembership> callerMembership) {
        return new CommunityResponse(
                community.getId(),
                community.getSlug(),
                community.getName(),
                community.getDescription(),
                community.getVisibility().name(),
                community.getIconUrl(),
                community.getCreatedByUid(),
                community.getMemberCount(),
                callerMembership.map(m -> m.getRole().name()).orElse(null),
                callerMembership.map(m -> m.getStatus().name()).orElse(null),
                community.getCreatedAt(),
                community.getUpdatedAt()
        );
    }

    public MembershipResponse toResponse(CommunityMembership membership) {
        return new MembershipResponse(
                membership.getId(),
                membership.getCommunityId(),
                membership.getUserUid(),
                membership.getRole().name(),
                membership.getStatus().name(),
                membership.getCreatedAt(),
                membership.getDecidedAt(),
                membership.getDecidedByUid()
        );
    }
}
