-- Virtual pets: exactly one pet per Firebase user for this sprint.
-- uk_pets_user enforces the one-pet-per-user rule at the database level
-- (mirrors the ownership-uniqueness pattern used by study_sessions).

CREATE TABLE pets (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    user_id     VARCHAR(128) NOT NULL,
    name        VARCHAR(64)  NOT NULL,
    species     VARCHAR(20)  NOT NULL,
    stage       VARCHAR(20)  NOT NULL,
    level       INT          NOT NULL DEFAULT 1,
    xp          INT          NOT NULL DEFAULT 0,
    coins       INT          NOT NULL DEFAULT 0,
    hunger      INT          NOT NULL DEFAULT 80,
    mood        INT          NOT NULL DEFAULT 90,
    bond        INT          NOT NULL DEFAULT 50,
    state       VARCHAR(20)  NOT NULL DEFAULT 'IDLE',
    created_at  DATETIME(6)  NOT NULL,
    updated_at  DATETIME(6)  NOT NULL,
    version     BIGINT       NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_pets_user UNIQUE (user_id),
    CONSTRAINT chk_pets_level CHECK (level >= 1),
    CONSTRAINT chk_pets_hunger_range CHECK (hunger BETWEEN 0 AND 100),
    CONSTRAINT chk_pets_mood_range CHECK (mood BETWEEN 0 AND 100),
    CONSTRAINT chk_pets_bond_range CHECK (bond BETWEEN 0 AND 100),
    CONSTRAINT chk_pets_xp_nonnegative CHECK (xp >= 0),
    CONSTRAINT chk_pets_coins_nonnegative CHECK (coins >= 0)
) ENGINE = InnoDB;
