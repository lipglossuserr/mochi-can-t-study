-- Community Rooms, Phase 3: comments on posts. Scoped to posts only —
-- the design doc's original draft sketches a polymorphic table shared
-- with blog posts (nullable dual FK), but blog_posts doesn't exist
-- yet (that's Phase 4), and a FK column pointing at a table that isn't
-- there yet is worse than adding it for real once it is. When Phase 4
-- lands, the plan is an ALTER TABLE adding a nullable blog_post_id +
-- FK + a CHECK ensuring exactly one of post_id/blog_post_id is set —
-- additive, not a rewrite of this table.
--
-- ON DELETE CASCADE: deleting a post deletes its comments with it,
-- same reasoning as every other cascade in this schema.

CREATE TABLE post_comments (
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    post_id      BIGINT       NOT NULL,
    author_uid   VARCHAR(128) NOT NULL,
    body         VARCHAR(1000) NOT NULL,
    upvote_count INT          NOT NULL DEFAULT 0,
    created_at   DATETIME(6)  NOT NULL,
    updated_at   DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_post_comments_post_created (post_id, created_at),
    CONSTRAINT fk_post_comments_post FOREIGN KEY (post_id)
        REFERENCES posts (id) ON DELETE CASCADE
) ENGINE = InnoDB;
