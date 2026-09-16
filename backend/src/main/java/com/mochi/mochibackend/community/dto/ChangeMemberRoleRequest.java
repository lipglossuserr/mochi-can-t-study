package com.mochi.mochibackend.community.dto;

import com.mochi.mochibackend.community.enums.MembershipRole;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/** Request payload for {@code POST /api/communities/{slug}/members/{targetUid}/role} — admin-only. */
@Getter
@Setter
public class ChangeMemberRoleRequest {

    @NotNull(message = "role is required")
    private MembershipRole role;
}
