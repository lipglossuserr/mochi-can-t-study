package com.mochi.mochibackend.community.entity;

import com.mochi.mochibackend.community.enums.ReactionType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * One user's reaction to a {@link Post}, a {@link Comment}, or a
 * {@link BlogPost} — exactly one of {@code postId}/{@code commentId}/
 * {@code blogPostId} is set per row; see {@code V19} migration's
 * header comment for why one table serves all of these rather than
 * separate ones, and {@code V21} for the Phase 4 widening that added
 * {@code blogPostId}.
 */
@Entity
@Table(
        name = "post_reactions",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_reactions_post_user", columnNames = {"post_id", "user_uid"}),
                @UniqueConstraint(name = "uk_reactions_comment_user", columnNames = {"comment_id", "user_uid"}),
                @UniqueConstraint(name = "uk_reactions_blogpost_user", columnNames = {"blog_post_id", "user_uid"})
        },
        indexes = {
                @Index(name = "idx_reactions_post", columnList = "post_id"),
                @Index(name = "idx_reactions_comment", columnList = "comment_id"),
                @Index(name = "idx_reactions_blog_post", columnList = "blog_post_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class Reaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Set when reacting to a post; null otherwise. */
    @Column(name = "post_id")
    private Long postId;

    /** Set when reacting to a comment; null otherwise. */
    @Column(name = "comment_id")
    private Long commentId;

    /** Set when reacting to a blog post; null otherwise. Phase 4. */
    @Column(name = "blog_post_id")
    private Long blogPostId;

    @Column(name = "user_uid", nullable = false, length = 128)
    private String userUid;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private ReactionType type = ReactionType.UPVOTE;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
