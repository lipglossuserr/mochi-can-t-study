package com.mochi.mochibackend.community.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Public view of a report — the moderation queue's row shape. Only ever shown to moderators/admins (see {@code ReportService.listQueue}). */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ReportResponse {

    private Long id;
    private String reporterUid;
    /** Exactly one of these three is non-null — mirrors {@code Report}'s polymorphic-FK shape. */
    private Long postId;
    private Long commentId;
    private Long blogPostId;
    private String reason;
    private String note;
    private String status;
    private String reviewedByUid;
    private Instant reviewedAt;
    private Instant createdAt;
}
