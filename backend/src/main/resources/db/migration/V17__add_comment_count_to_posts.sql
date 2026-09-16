-- Community Rooms, Phase 3: posts.comment_count was in the original
-- design doc's schema draft alongside upvote_count, but — same
-- reasoning as upvote_count in V15 — there was nothing to count until
-- comments existed. Added now as its own migration rather than
-- bundled into V15, so each migration's diff matches one phase of
-- actual functionality landing.

ALTER TABLE posts
    ADD COLUMN comment_count INT NOT NULL DEFAULT 0 AFTER upvote_count;
