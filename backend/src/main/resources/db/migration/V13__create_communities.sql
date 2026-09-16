-- Community Rooms, Phase 1: the community itself. A community is either
-- PUBLIC (anyone can join instantly) or PRIVATE (join requests sit as
-- PENDING in community_memberships until a moderator/admin approves
-- them — see V14). member_count is a denormalized counter maintained by
-- CommunityService alongside every join/leave/approve, the same
-- optimistic-locking-guarded-counter pattern used elsewhere in this
-- schema (see StudySession's `version` column).

CREATE TABLE communities (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    slug             VARCHAR(64)  NOT NULL,
    name             VARCHAR(100) NOT NULL,
    description      VARCHAR(500) NULL,
    visibility       VARCHAR(10)  NOT NULL DEFAULT 'PUBLIC',
    icon_url         VARCHAR(255) NULL,
    created_by_uid   VARCHAR(128) NOT NULL,
    member_count     INT          NOT NULL DEFAULT 0,
    created_at       DATETIME(6)  NOT NULL,
    updated_at       DATETIME(6)  NOT NULL,
    version          BIGINT       NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uk_communities_slug (slug)
) ENGINE = InnoDB;
