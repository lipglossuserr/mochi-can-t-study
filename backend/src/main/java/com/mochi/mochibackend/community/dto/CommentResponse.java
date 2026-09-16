package com.mochi.mochibackend.community.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Public view of a comment. Comments are always attributed — no anonymity option in Phase 3, see the {@code Comment} entity's javadoc. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CommentResponse {

    private Long id;
    /** Set for a comment on a short post; null for a comment on a blog post. */
    private Long postId;
    /** Set for a comment on a blog post; null for a comment on a short post. Phase 4. */
    private Long blogPostId;
    /** Set for a reply; null for a top-level comment. v2 backlog (threaded comments). */
    private Long parentCommentId;
    private String authorUid;
    private String body;
    private int upvoteCount;
    private boolean callerUpvoted;
    private Instant createdAt;
    private Instant updatedAt;
}
