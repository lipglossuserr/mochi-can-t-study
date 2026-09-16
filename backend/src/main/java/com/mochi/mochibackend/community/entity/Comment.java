package com.mochi.mochibackend.community.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * A comment on either a {@link Post} or a {@link BlogPost} — exactly
 * one of {@code postId}/{@code blogPostId} is set per row. Scoped to
 * posts only through Phase 3; widened for blog posts in Phase 4 per
 * the {@code V21} migration, exactly the additive ALTER TABLE that
 * {@code V18}'s header comment called out ahead of time. No anonymity
 * option here (unlike {@code Post}): comments are always attributed,
 * kept simple deliberately rather than extending the
 * anonymous-authorship machinery to this entity for a feature nobody
 * asked for yet.
 */
@Entity
@Table(
        name = "post_comments",
        indexes = {
                @Index(name = "idx_post_comments_post_created", columnList = "post_id, created_at"),
                @Index(name = "idx_post_comments_blog_post_created", columnList = "blog_post_id, created_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Set when commenting on a short post; null when commenting on a blog post. */
    @Column(name = "post_id")
    private Long postId;

    /** Set when commenting on a blog post; null when commenting on a short post. Phase 4. */
    @Column(name = "blog_post_id")
    private Long blogPostId;

    /**
     * Set when this comment is a reply to another comment; null for a
     * top-level comment. v2 backlog (threaded comments) — exactly one
     * level of nesting: a reply's own {@code parentCommentId} always
     * points at a comment whose own {@code parentCommentId} is null,
     * enforced by {@code CommentService}, not by this column alone. See
     * the {@code V24} migration's header comment for why depth is
     * capped at one level.
     */
    @Column(name = "parent_comment_id")
    private Long parentCommentId;

    @Column(name = "author_uid", nullable = false, length = 128)
    private String authorUid;

    @Column(name = "body", nullable = false, length = 1000)
    private String body;

    /** Kept in sync by {@code ReactionService} on every comment upvote toggle. */
    @Column(name = "upvote_count", nullable = false)
    private int upvoteCount;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
