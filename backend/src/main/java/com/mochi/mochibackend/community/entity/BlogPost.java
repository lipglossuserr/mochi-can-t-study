package com.mochi.mochibackend.community.entity;

import com.mochi.mochibackend.community.enums.BlogStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * A long-form, Medium-like blog post within a community — Community
 * Rooms Phase 4, see ADR-014 §1 and the {@code V20} migration's header
 * comment for why this is its own table rather than a fifth
 * {@link com.mochi.mochibackend.community.enums.PostType}.
 * <p>
 * {@code slug} is per-community (unique on {@code (communityId, slug)},
 * not globally) so URLs read as {@code /community/:slug/blog/:blogSlug}
 * without a global slug registry — reuses {@code CommunityService}'s
 * slug-derivation approach ({@code BlogPostService} follows the same
 * lowercase/hyphenate/collision-suffix recipe).
 * <p>
 * {@code bodyPlaintext}/{@code readingTimeMinutes} are both derived
 * from {@code body} and recomputed by {@code BlogPostService} on every
 * save — see the migration's comment for why they're stored rather
 * than computed on read.
 */
@Entity
@Table(
        name = "blog_posts",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_blog_posts_community_slug", columnNames = {"community_id", "slug"})
        },
        indexes = {
                @Index(name = "idx_blog_posts_community_status_published", columnList = "community_id, status, published_at"),
                @Index(name = "idx_blog_posts_community_author", columnList = "community_id, author_uid")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class BlogPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "community_id", nullable = false)
    private Long communityId;

    @Column(name = "author_uid", nullable = false, length = 128)
    private String authorUid;

    @Column(name = "slug", nullable = false, length = 220)
    private String slug;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    /** Optional. v1 accepts a plain URL rather than an upload broker — see the design doc's §5 media note. */
    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    /** Rich body, stored as the editor's own lightweight markup (see {@code BlogEditor} on the frontend). */
    @Lob
    @Column(name = "body", nullable = false)
    private String body;

    /** Tag-stripped copy of {@code body}, kept in sync by {@code BlogPostService}; powers list-view excerpts and a future FULLTEXT index. */
    @Lob
    @Column(name = "body_plaintext")
    private String bodyPlaintext;

    @Column(name = "reading_time_minutes", nullable = false)
    private int readingTimeMinutes = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private BlogStatus status = BlogStatus.DRAFT;

    /** Kept in sync by {@code ReactionService} on every blog-post upvote toggle. */
    @Column(name = "upvote_count", nullable = false)
    private int upvoteCount;

    /** Kept in sync by {@code CommentService} on every blog comment create/delete. */
    @Column(name = "comment_count", nullable = false)
    private int commentCount;

    /** Null while DRAFT; set once by {@code BlogPostService.publish} and never cleared by unpublish (unpublish only flips {@code status} back). */
    @Column(name = "published_at")
    private Instant publishedAt;

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
