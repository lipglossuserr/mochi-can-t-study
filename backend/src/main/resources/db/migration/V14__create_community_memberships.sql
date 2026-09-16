-- One row per (community, user) pairing — the same row tracks a pending
-- join request, an approved membership, and a rejected one, so the full
-- history of a user's relationship to a community lives in one place
-- rather than being scattered across a request table and a separate
-- membership table. `role` is community-scoped (a user who is ADMIN of
-- one community is not automatically anything in another), matching the
-- per-community-roles decision in the Community Rooms design doc.
--
-- ON DELETE CASCADE: deleting a community deletes its memberships with
-- it — there is no meaningful "membership in a community that no longer
-- exists".

CREATE TABLE community_memberships (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    community_id    BIGINT       NOT NULL,
    user_uid        VARCHAR(128) NOT NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'MEMBER',
    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    decided_at      DATETIME(6)  NULL,
    decided_by_uid  VARCHAR(128) NULL,
    created_at      DATETIME(6)  NOT NULL,
    updated_at      DATETIME(6)  NOT NULL,
    version         BIGINT       NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uk_membership_community_user (community_id, user_uid),
    INDEX idx_membership_community_status (community_id, status),
    INDEX idx_membership_user (user_uid),
    CONSTRAINT fk_membership_community FOREIGN KEY (community_id)
        REFERENCES communities (id) ON DELETE CASCADE
) ENGINE = InnoDB;
