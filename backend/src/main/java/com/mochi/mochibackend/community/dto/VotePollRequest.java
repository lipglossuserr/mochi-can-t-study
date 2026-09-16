package com.mochi.mochibackend.community.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/** Request payload for {@code POST /api/communities/{slug}/posts/{postId}/vote}. */
@Getter
@Setter
public class VotePollRequest {

    @NotNull(message = "optionId is required")
    private Long optionId;
}
