package com.mochi.mochibackend.community.entity;

import com.mochi.mochibackend.community.enums.PostType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * A short-form post in a community: a room share, help request, vent,
 * or poll (see {@link PostType}). One table for all four, same reasoning
 * as {@code V15__create_posts.sql}'s header comment — they share a
 * lifecycle and splitting them would multiply near-identical code, not
 * reduce it.
 * <p>
 * {@code communityId}/{@code authorUid} are plain FK-by-value columns,
 * matching {@code CommunityMembership}'s convention — this entity
 * doesn't need to navigate to {@code Community}, only to know its id.
 * {@code upvoteCount}/{@code commentCount} are denormalized counters
 * kept in sync by {@code ReactionService}/{@code CommentService}
 * (Phase 3) inside the same transaction as the underlying
 * reaction/comment write.
 */
@Entity
@Table(
        name = "posts",
        indexes = {
                @Index(name = "idx_posts_community_created", columnList = "community_id, created_at"),
                @Index(name = "idx_posts_community_type", columnList = "community_id, type"),
                @Index(name = "idx_posts_community_pinned", columnList = "community_id, is_pinned")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "community_id", nullable = false)
    private Long communityId;

    /** Firebase uid of the author. Kept even when {@code isAnonymous} is true — accountable-not-anonymous authorship, per the design doc's abuse-resistance note; only display is anonymized. */
    @Column(name = "author_uid", nullable = false, length = 128)
    private String authorUid;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private PostType type;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "body", length = 2000)
    private String body;

    @Column(name = "is_anonymous", nullable = false)
    private boolean anonymous;

    @Column(name = "is_pinned", nullable = false)
    private boolean pinned;

    /** Meaningful only for HELP_REQUEST; stays false for every other type. */
    @Column(name = "is_resolved", nullable = false)
    private boolean resolved;

    /** ROOM_SHARE only. */
    @Column(name = "study_room_code", length = 64)
    private String studyRoomCode;

    /** ROOM_SHARE only; null means "no expiry set." */
    @Column(name = "study_room_expires_at")
    private Instant studyRoomExpiresAt;

    /** Kept in sync by {@code ReactionService} on every post upvote toggle. */
    @Column(name = "upvote_count", nullable = false)
    private int upvoteCount;

    /** Kept in sync by {@code CommentService} on every comment create/delete. */
    @Column(name = "comment_count", nullable = false)
    private int commentCount;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;
}
