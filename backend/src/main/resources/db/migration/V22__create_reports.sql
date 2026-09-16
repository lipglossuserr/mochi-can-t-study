-- Community Rooms, Phase 5: the moderation report queue. Same
-- polymorphic-FK shape `post_comments`/`post_reactions` already use
-- (V18/V19/V21's header comments) — exactly one of
-- post_id/comment_id/blog_post_id is set per row, enforced by the
-- CHECK constraint below.
--
-- Unique keys (uk_reports_*_reporter) enforce "one open report per
-- (reporter, content)" the same way post_reactions enforces "one
-- upvote per (user, content)" — a user can't spam-report the same
-- thing repeatedly to flood the queue. ReportService checks this
-- proactively before insert (see its javadoc) rather than relying on
-- catching a constraint violation, but the DB-level guarantee stays
-- as the backstop.
--
-- reason is a short fixed enum (see ReportReason), not free text —
-- `note` carries anything more specific. status starts PENDING;
-- reviewed_by_uid/reviewed_at are set together when a moderator
-- dismisses or resolves a report (see ReportService.dismiss/
-- removeContent/banAuthor).
--
-- ON DELETE CASCADE for community_id — deleting a community deletes
-- its reports with it, same as every other community-scoped table.
-- No FK to posts/comments/blog_posts: a report should survive its
-- target being deleted (e.g. the author deleted their own post before
-- a moderator got to the report) so the queue can still show "this
-- was reported, but the content is already gone" rather than the row
-- vanishing silently — ReportService handles a since-deleted target
-- gracefully when a moderator acts on it.

CREATE TABLE reports (
    id                BIGINT        NOT NULL AUTO_INCREMENT,
    community_id      BIGINT        NOT NULL,
    reporter_uid      VARCHAR(128)  NOT NULL,
    post_id           BIGINT        NULL,
    comment_id        BIGINT        NULL,
    blog_post_id      BIGINT        NULL,
    reason            VARCHAR(20)   NOT NULL,
    note              VARCHAR(500)  NULL,
    status            VARCHAR(10)   NOT NULL DEFAULT 'PENDING',
    reviewed_by_uid   VARCHAR(128)  NULL,
    reviewed_at       DATETIME(6)   NULL,
    created_at        DATETIME(6)   NOT NULL,
    updated_at        DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_reports_post_reporter (post_id, reporter_uid),
    UNIQUE KEY uk_reports_comment_reporter (comment_id, reporter_uid),
    UNIQUE KEY uk_reports_blogpost_reporter (blog_post_id, reporter_uid),
    INDEX idx_reports_community_status_created (community_id, status, created_at),
    CONSTRAINT fk_reports_community FOREIGN KEY (community_id)
        REFERENCES communities (id) ON DELETE CASCADE,
    CONSTRAINT chk_reports_one_target CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL AND blog_post_id IS NULL) OR
        (post_id IS NULL AND comment_id IS NOT NULL AND blog_post_id IS NULL) OR
        (post_id IS NULL AND comment_id IS NULL AND blog_post_id IS NOT NULL)
    )
) ENGINE = InnoDB;
