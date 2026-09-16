-- Community Rooms, v2 backlog: threaded comments — one level of reply
-- nesting (a comment can reply to a top-level comment; a reply cannot
-- itself be replied to). Deliberately not unlimited-depth threading:
-- the design doc's "resist scope creep" instinct applies here the same
-- way it did to the blog editor staying textarea-based — one level
-- covers the actual use case (clarify/respond to a specific comment)
-- without the recursive-query and recursive-UI complexity unlimited
-- depth would need. CommentService enforces the depth-1 rule; this
-- column alone doesn't prevent deeper nesting.
--
-- Self-referential FK within post_comments, nullable (most comments
-- are still top-level, parent_comment_id NULL). ON DELETE CASCADE:
-- deleting a parent comment deletes its replies with it, same
-- reasoning every other cascade in this schema uses — a reply with a
-- deleted, invisible parent would be a confusing orphan.

ALTER TABLE post_comments
    ADD COLUMN parent_comment_id BIGINT NULL AFTER blog_post_id,
    ADD INDEX idx_post_comments_parent (parent_comment_id),
    ADD CONSTRAINT fk_post_comments_parent FOREIGN KEY (parent_comment_id)
        REFERENCES post_comments (id) ON DELETE CASCADE;
