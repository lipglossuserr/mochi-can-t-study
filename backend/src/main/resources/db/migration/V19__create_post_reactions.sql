-- Community Rooms, Phase 3: reactions. One table for both post
-- upvotes and comment upvotes (post_id/comment_id nullable, exactly
-- one set per row) rather than two near-identical tables — same
-- reasoning as post_comments eventually sharing with blog_comments.
-- `type` is a real column (not just a upvotes-only table) so a future
-- reaction type doesn't need a schema change, even though UPVOTE is
-- the only value Phase 3 ever writes.
--
-- Two separate unique keys, not one: uk_reactions_post_user only
-- constrains rows where comment_id is NULL (and vice versa) because
-- MySQL treats each NULL as distinct for uniqueness purposes — exactly
-- the "one reaction per user per post" / "one reaction per user per
-- comment" behavior wanted, without a CHECK-constraint-and-partial-index
-- dance.

CREATE TABLE post_reactions (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    post_id     BIGINT       NULL,
    comment_id  BIGINT       NULL,
    user_uid    VARCHAR(128) NOT NULL,
    type        VARCHAR(20)  NOT NULL DEFAULT 'UPVOTE',
    created_at  DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_reactions_post_user (post_id, user_uid),
    UNIQUE KEY uk_reactions_comment_user (comment_id, user_uid),
    INDEX idx_reactions_post (post_id),
    INDEX idx_reactions_comment (comment_id),
    CONSTRAINT fk_reactions_post FOREIGN KEY (post_id)
        REFERENCES posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_reactions_comment FOREIGN KEY (comment_id)
        REFERENCES post_comments (id) ON DELETE CASCADE
) ENGINE = InnoDB;
