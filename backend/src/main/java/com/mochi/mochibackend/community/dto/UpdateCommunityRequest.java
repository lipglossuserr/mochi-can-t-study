package com.mochi.mochibackend.community.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Request payload for {@code PATCH /api/communities/{slug}} — admin-only
 * (see {@code CommunityService.update}'s javadoc for why this is
 * stricter than the moderator-or-admin gate elsewhere). Every field is
 * optional; an omitted field is left unchanged, same convention as
 * {@code UpdatePostRequest}/{@code UpdateBlogPostRequest}. Unlike
 * those, there's no field for {@code visibility} or {@code slug} here —
 * changing a community's visibility or URL after members have already
 * joined it under one set of expectations is a bigger decision than
 * this endpoint is scoped to make; both stay creation-time-only for now.
 */
@Getter
@Setter
public class UpdateCommunityRequest {

    @Size(min = 1, max = 100, message = "Name must be between 1 and 100 characters")
    private String name;

    @Size(max = 500, message = "Description must be at most 500 characters")
    private String description;

    @Size(max = 255, message = "Icon URL must be at most 255 characters")
    private String iconUrl;
}
