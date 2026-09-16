-- Community Rooms, Phase 4: long-form blog posts (the Medium-like
-- layer, see ADR-014 §1). A separate table from `posts` rather than a
-- fifth `PostType` value — blogs have a materially different shape
-- (title + cover image + rich body + draft/publish lifecycle + reading
-- time) and folding them into the short-post table would mean a pile
-- of columns that stay NULL for every other post type, the exact
-- thing V15's header comment says that table avoids.
--
-- `body` is TEXT, not VARCHAR(2000) like a short post's body — blog
-- posts are long-form by design. `body_plaintext` is a denormalized,
-- tag-stripped copy of `body`, kept in sync by `BlogPostService`
-- whenever `body` changes: it exists purely so a future `FULLTEXT`
-- index (§5 of the design doc, deferred to v2) has something to index
-- without re-parsing rich-text markup at query time, and so list views
-- can render a plain-text excerpt cheaply.
--
-- `reading_time_minutes` is computed server-side on every save
-- (word count / 200wpm, minimum 1) and stored rather than computed on
-- read, so sorting/filtering by it later doesn't need a full-text scan.
--
-- status starts at DRAFT; publishing sets `published_at`. Unlike posts,
-- there's a real draft state a non-author (even a fellow member) must
-- never see — enforced in `BlogPostService`, not by a query filter
-- alone, since the author's own drafts still need to be listable.
--
-- ON DELETE CASCADE: deleting a community deletes its blog posts with
-- it, same reasoning as every other cascade in this schema.

CREATE TABLE blog_posts (
    id                     BIGINT        NOT NULL AUTO_INCREMENT,
    community_id           BIGINT        NOT NULL,
    author_uid             VARCHAR(128)  NOT NULL,
    slug                   VARCHAR(220)  NOT NULL,
    title                  VARCHAR(200)  NOT NULL,
    cover_image_url        VARCHAR(500)  NULL,
    body                   TEXT          NOT NULL,
    body_plaintext         TEXT          NULL,
    reading_time_minutes   INT           NOT NULL DEFAULT 1,
    status                 VARCHAR(10)   NOT NULL DEFAULT 'DRAFT',
    upvote_count           INT           NOT NULL DEFAULT 0,
    comment_count          INT           NOT NULL DEFAULT 0,
    published_at           DATETIME(6)   NULL,
    created_at             DATETIME(6)   NOT NULL,
    updated_at             DATETIME(6)   NOT NULL,
    version                BIGINT        NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uk_blog_posts_community_slug (community_id, slug),
    INDEX idx_blog_posts_community_status_published (community_id, status, published_at),
    INDEX idx_blog_posts_community_author (community_id, author_uid),
    CONSTRAINT fk_blog_posts_community FOREIGN KEY (community_id)
        REFERENCES communities (id) ON DELETE CASCADE
) ENGINE = InnoDB;
