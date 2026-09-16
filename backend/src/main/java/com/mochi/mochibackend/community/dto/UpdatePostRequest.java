package com.mochi.mochibackend.community.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Request payload for {@code PATCH /api/communities/{slug}/posts/{postId}}
 * — author-only edit of title/body. Type, anonymity, and poll options
 * are immutable after creation in Phase 2; pin/resolve have their own
 * dedicated endpoints since those are moderator/author actions, not
 * edits. Either field may be omitted to leave it unchanged.
 */
@Getter
@Setter
public class UpdatePostRequest {

    @Size(min = 1, max = 200, message = "Title must be between 1 and 200 characters")
    private String title;

    @Size(max = 2000, message = "Body must be at most 2000 characters")
    private String body;
}
