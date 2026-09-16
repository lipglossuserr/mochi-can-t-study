package com.mochi.mochibackend.community.entity;

import com.mochi.mochibackend.community.enums.ReportReason;
import com.mochi.mochibackend.community.enums.ReportStatus;
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
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * A member's report of a {@link Post}, {@link Comment}, or
 * {@link BlogPost} — Community Rooms Phase 5. Exactly one of
 * {@code postId}/{@code commentId}/{@code blogPostId} is set per row;
 * see the {@code V22} migration's header comment for why this reuses
 * the same polymorphic-FK shape {@code Comment}/{@code Reaction}
 * already established, and for why there's deliberately no FK to the
 * target tables (a report should survive its target being deleted).
 */
@Entity
@Table(
        name = "reports",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_reports_post_reporter", columnNames = {"post_id", "reporter_uid"}),
                @UniqueConstraint(name = "uk_reports_comment_reporter", columnNames = {"comment_id", "reporter_uid"}),
                @UniqueConstraint(name = "uk_reports_blogpost_reporter", columnNames = {"blog_post_id", "reporter_uid"})
        },
        indexes = {
                @Index(name = "idx_reports_community_status_created", columnList = "community_id, status, created_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "community_id", nullable = false)
    private Long communityId;

    @Column(name = "reporter_uid", nullable = false, length = 128)
    private String reporterUid;

    /** Set when reporting a post; null otherwise. */
    @Column(name = "post_id")
    private Long postId;

    /** Set when reporting a comment (on either a post or a blog post); null otherwise. */
    @Column(name = "comment_id")
    private Long commentId;

    /** Set when reporting a blog post; null otherwise. */
    @Column(name = "blog_post_id")
    private Long blogPostId;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason", nullable = false, length = 20)
    private ReportReason reason;

    /** Optional free-text detail, especially for {@link ReportReason#OTHER}. */
    @Column(name = "note", length = 500)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private ReportStatus status = ReportStatus.PENDING;

    /** Set together with {@code reviewedAt} when a moderator dismisses or resolves this report. */
    @Column(name = "reviewed_by_uid", length = 128)
    private String reviewedByUid;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
