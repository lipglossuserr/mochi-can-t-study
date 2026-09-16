package com.mochi.mochibackend.community.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Public view of one membership row — used by the member-list and
 * pending-requests endpoints (mod/admin only for the latter).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MembershipResponse {

    private Long id;
    private Long communityId;
    private String userUid;
    private String role;
    private String status;
    private Instant requestedAt;
    private Instant decidedAt;
    private String decidedByUid;
}
