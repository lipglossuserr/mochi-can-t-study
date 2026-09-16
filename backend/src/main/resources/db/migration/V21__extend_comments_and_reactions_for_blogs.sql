-- Community Rooms, Phase 4: widen comments/reactions to also target
-- blog posts, exactly the additive ALTER TABLE that V18's and V19's
-- header comments called out ahead of time — no rewrite of either
-- table, just a nullable FK column, an index, an updated unique key,
-- and a CHECK ensuring exactly one owner per row.
--
-- post_comments: `post_id` becomes nullable (it was NOT NULL through
-- Phase 3) and a nullable `blog_post_id` is added alongside it. Every
-- existing row already has `post_id` set, so this is safe as a plain
-- ALTER — no backfill needed.
--
-- post_reactions: same shape, `blog_post_id` joins `post_id`/`comment_id`
-- as a third optional target, with its own unique key
-- (`uk_reactions_blogpost_user`) so "one upvote per user per blog post"
-- is enforced the same way the other two targets already are.

ALTER TABLE post_comments
    MODIFY COLUMN post_id BIGINT NULL,
    ADD COLUMN blog_post_id BIGINT NULL AFTER post_id,
    ADD INDEX idx_post_comments_blog_post_created (blog_post_id, created_at),
    ADD CONSTRAINT fk_post_comments_blog_post FOREIGN KEY (blog_post_id)
        REFERENCES blog_posts (id) ON DELETE CASCADE,
    ADD CONSTRAINT chk_post_comments_one_owner CHECK (
        (post_id IS NOT NULL AND blog_post_id IS NULL) OR
        (post_id IS NULL AND blog_post_id IS NOT NULL)
    );

ALTER TABLE post_reactions
    ADD COLUMN blog_post_id BIGINT NULL AFTER comment_id,
    ADD UNIQUE KEY uk_reactions_blogpost_user (blog_post_id, user_uid),
    ADD INDEX idx_reactions_blog_post (blog_post_id),
    ADD CONSTRAINT fk_reactions_blog_post FOREIGN KEY (blog_post_id)
        REFERENCES blog_posts (id) ON DELETE CASCADE,
    ADD CONSTRAINT chk_post_reactions_one_owner CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL AND blog_post_id IS NULL) OR
        (post_id IS NULL AND comment_id IS NOT NULL AND blog_post_id IS NULL) OR
        (post_id IS NULL AND comment_id IS NULL AND blog_post_id IS NOT NULL)
    );
