package com.mochi.mochibackend.community.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Request payload for {@code PATCH /api/communities/{slug}/blog/{blogId}}
 * — author-only edit. Every field is optional; omitted fields are left
 * unchanged, same convention as {@code UpdatePostRequest}. Editing is
 * allowed in both DRAFT and PUBLISHED status — there's no "lock after
 * publish" rule, matching a real blogging tool.
 */
@Getter
@Setter
public class UpdateBlogPostRequest {

    @Size(min = 1, max = 200, message = "Title must be between 1 and 200 characters")
    private String title;

    @Size(max = 500, message = "Cover image URL must be at most 500 characters")
    private String coverImageUrl;

    private String body;
}
