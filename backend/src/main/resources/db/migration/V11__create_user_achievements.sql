-- Tracks which achievements each user has unlocked. The catalog of
-- achievements itself (title/description/emoji/criteria) is NOT a table
-- -- it lives in code as AchievementDefinition, the same "small fixed
-- set of tunables" pattern RewardPolicy/LevelCalculator already use.
-- Only the per-user unlock event needs persistence.

CREATE TABLE user_achievements (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    user_id          VARCHAR(128) NOT NULL,
    achievement_key  VARCHAR(64)  NOT NULL,
    unlocked_at      DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_user_achievements_user_key UNIQUE (user_id, achievement_key)
) ENGINE = InnoDB;

CREATE INDEX idx_user_achievements_user ON user_achievements (user_id);
