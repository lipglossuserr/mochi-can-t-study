package com.mochi.mochibackend.community.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Public view of a community. {@code callerRole}/{@code callerStatus}
 * are null when the caller has no membership row at all (never joined,
 * never requested) — the frontend treats null the same as "NONE" for
 * deciding which CTA (Join / Request Access / Pending / Open) to show.
 * Entities are never exposed directly — every response goes through
 * {@code CommunityMapper}.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CommunityResponse {

    private Long id;
    private String slug;
    private String name;
    private String description;
    private String visibility;
    private String iconUrl;
    private String createdByUid;
    private int memberCount;
    private String callerRole;
    private String callerStatus;
    private Instant createdAt;
    private Instant updatedAt;
}
