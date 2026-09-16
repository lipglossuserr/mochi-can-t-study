package com.mochi.mochibackend.community.enums;

/**
 * Lifecycle of one report. PENDING sits in the moderation queue until
 * a moderator/admin acts. DISMISSED: reviewed, no action needed.
 * RESOLVED: reviewed and acted on — either the content was removed or
 * its author was banned (see {@code ReportService.removeContent}/
 * {@code banAuthor}). There's no separate "content removed" vs
 * "author banned" status — both collapse to RESOLVED, since the
 * distinguishing detail (what action was taken) isn't something the
 * queue needs to filter on, only whether a report still needs
 * attention.
 */
public enum ReportStatus {
    PENDING,
    DISMISSED,
    RESOLVED
}
