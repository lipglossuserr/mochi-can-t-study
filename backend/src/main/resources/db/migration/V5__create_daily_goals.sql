-- Daily Goals: any number per Firebase user per day (unlike the
-- one-active-session rule study_sessions enforces, and unlike the
-- one-per-user pets table) — a user may track several goals on the same
-- goal_date, including several CUSTOM ones, so no uniqueness constraint
-- is added on (user_uid, goal_date, type).
--
-- No FK to tasks or study_sessions: this sprint (7.4A) is the backend
-- foundation only. Automatically generating goals and automatically
-- advancing `current_value` from finished study sessions or completed
-- tasks is explicitly deferred to a later sprint, so there is nothing
-- for a foreign key to reference yet.

CREATE TABLE daily_goals (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    user_uid      VARCHAR(128) NOT NULL,
    goal_date     DATE         NOT NULL,
    type          VARCHAR(20)  NOT NULL,
    title         VARCHAR(200) NOT NULL,
    current_value INT          NOT NULL DEFAULT 0,
    target_value  INT          NOT NULL,
    completed     TINYINT(1)   NOT NULL DEFAULT 0,
    completed_at  DATETIME(6)  NULL,
    created_at    DATETIME(6)  NOT NULL,
    updated_at    DATETIME(6)  NOT NULL,
    version       BIGINT       NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    INDEX idx_daily_goals_user_date (user_uid, goal_date),
    INDEX idx_daily_goals_user_date_completed (user_uid, goal_date, completed)
) ENGINE = InnoDB;
