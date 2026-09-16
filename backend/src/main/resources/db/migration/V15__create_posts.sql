-- Community Rooms, Phase 2: short-form posts. One table serves all four
-- post types (ROOM_SHARE, HELP_REQUEST, VENT, POLL) rather than one
-- table per type — they share the same lifecycle (create, pin, upvote,
-- comment) and splitting them would mean four near-identical tables and
-- four near-identical services for what is, structurally, one entity
-- with a discriminator column. Type-specific fields (study_room_code,
-- is_resolved) simply stay NULL/false for the types that don't use them.
--
-- upvote_count exists here but is not populated until Phase 3
-- (comments + reactions) — see the Community Rooms design doc's build
-- order. It's in the schema now so Phase 3 is an additive change, not
-- a migration that touches this table again.
--
-- ON DELETE CASCADE: deleting a community deletes its posts with it,
-- same reasoning as community_memberships in V14.

CREATE TABLE posts (
    id                      BIGINT       NOT NULL AUTO_INCREMENT,
    community_id            BIGINT       NOT NULL,
    author_uid              VARCHAR(128) NOT NULL,
    type                    VARCHAR(20)  NOT NULL,
    title                   VARCHAR(200) NOT NULL,
    body                    VARCHAR(2000) NULL,
    is_anonymous            BOOLEAN      NOT NULL DEFAULT FALSE,
    is_pinned               BOOLEAN      NOT NULL DEFAULT FALSE,
    is_resolved             BOOLEAN      NOT NULL DEFAULT FALSE,
    study_room_code         VARCHAR(64)  NULL,
    study_room_expires_at   DATETIME(6)  NULL,
    upvote_count            INT          NOT NULL DEFAULT 0,
    created_at              DATETIME(6)  NOT NULL,
    updated_at               DATETIME(6)  NOT NULL,
    version                 BIGINT       NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    INDEX idx_posts_community_created (community_id, created_at),
    INDEX idx_posts_community_type (community_id, type),
    INDEX idx_posts_community_pinned (community_id, is_pinned),
    CONSTRAINT fk_posts_community FOREIGN KEY (community_id)
        REFERENCES communities (id) ON DELETE CASCADE
) ENGINE = InnoDB;
