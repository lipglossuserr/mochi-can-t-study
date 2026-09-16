package com.mochi.mochibackend.community.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/** Request payload for {@code POST /api/communities/{slug}/posts/{postId}/comments}. */
@Getter
@Setter
public class CreateCommentRequest {

    @NotNull(message = "Comment body is required")
    @Size(min = 1, max = 1000, message = "Comment must be between 1 and 1000 characters")
    private String body;

    /**
     * Optional — set to reply to another comment. v2 backlog (threaded
     * comments). Must reference a top-level comment on the same post/
     * blog post; {@code CommentService} enforces both the "same target"
     * and "one level deep" rules and rejects anything else with
     * {@code InvalidCommentRequestException}.
     */
    private Long parentCommentId;
}
