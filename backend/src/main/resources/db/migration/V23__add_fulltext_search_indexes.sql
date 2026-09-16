-- Community Rooms, v2 backlog: search. The design doc is explicit that
-- a MySQL FULLTEXT index on title/body is "genuinely sufficient at
-- this scale" and a "real stopgap, not a hack" — unlike Meilisearch/
-- Algolia (deferred until community/post volume actually justifies a
-- dedicated search service) and the Perspective API moderation
-- pre-screen (deferred until there's real abuse-volume data to justify
-- the added complexity), this one is safe and cheap to build now
-- rather than defer.
--
-- Natural-language FULLTEXT search (MATCH ... AGAINST) needs InnoDB
-- FULLTEXT indexes, supported since MySQL 5.6 — no engine change
-- needed, both tables are already InnoDB.
--
-- posts: indexes title + body together so one MATCH covers both
-- fields at once (a search for a word only in the body still matches).
-- blog_posts: indexes title + body_plaintext (not the raw `body`,
-- which carries the editor's lightweight markup syntax — see
-- BlogPostService.stripMarkup's javadoc for why body_plaintext exists;
-- this is precisely the "future FULLTEXT index" that comment
-- anticipated).

ALTER TABLE posts
    ADD FULLTEXT INDEX ftx_posts_title_body (title, body);

ALTER TABLE blog_posts
    ADD FULLTEXT INDEX ftx_blog_posts_title_body (title, body_plaintext);
