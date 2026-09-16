-- Community Rooms, Phase 2 (continued): poll storage for POST type
-- POLL. Two tables, not one, because the relationship is genuinely
-- one-to-many-to-many: a poll post has 2-10 options (poll_options),
-- and each option accumulates votes from distinct users
-- (poll_votes) — collapsing these would either duplicate option rows
-- per voter or require a JSON blob that can't enforce
-- "one vote per user per poll" at the database level the way the
-- unique key below does.
--
-- vote_count on poll_options is a denormalized counter (same pattern
-- as communities.member_count) kept in sync by PostService inside the
-- same transaction as the poll_votes insert — no separate
-- reconciliation job needed at this scale, per the design doc's
-- scale notes.

CREATE TABLE poll_options (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    post_id        BIGINT       NOT NULL,
    label          VARCHAR(120) NOT NULL,
    vote_count     INT          NOT NULL DEFAULT 0,
    display_order  INT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    INDEX idx_poll_options_post (post_id),
    CONSTRAINT fk_poll_options_post FOREIGN KEY (post_id)
        REFERENCES posts (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- UNIQUE(post_id, user_uid): a voter picks exactly one option per
-- poll. post_id is denormalized onto this table (derivable via
-- poll_option_id -> poll_options.post_id) purely so that uniqueness
-- constraint doesn't require a join to enforce at the DB layer.
CREATE TABLE poll_votes (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    poll_option_id  BIGINT       NOT NULL,
    post_id         BIGINT       NOT NULL,
    user_uid        VARCHAR(128) NOT NULL,
    created_at      DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_poll_votes_post_user (post_id, user_uid),
    INDEX idx_poll_votes_option (poll_option_id),
    CONSTRAINT fk_poll_votes_option FOREIGN KEY (poll_option_id)
        REFERENCES poll_options (id) ON DELETE CASCADE,
    CONSTRAINT fk_poll_votes_post FOREIGN KEY (post_id)
        REFERENCES posts (id) ON DELETE CASCADE
) ENGINE = InnoDB;
