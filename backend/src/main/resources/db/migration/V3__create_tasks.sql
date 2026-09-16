-- Tasks: any number per Firebase user (unlike the one-per-user pets
-- table). No FK to study_sessions in either direction yet — study_sessions
-- already carries a nullable, unconstrained task_id column (added in
-- Sprint 2) as its side of that future link; Sprint 7.2B is expected to
-- turn it into a real foreign key once both tables exist.

CREATE TABLE tasks (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    user_uid      VARCHAR(128) NOT NULL,
    title         VARCHAR(200) NOT NULL,
    description   VARCHAR(2000) NULL,
    due_date      DATETIME(6)  NULL,
    priority      VARCHAR(10)  NOT NULL DEFAULT 'MEDIUM',
    status        VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    completed_at  DATETIME(6)  NULL,
    created_at    DATETIME(6)  NOT NULL,
    updated_at    DATETIME(6)  NOT NULL,
    version       BIGINT       NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    INDEX idx_tasks_user (user_uid),
    INDEX idx_tasks_user_status (user_uid, status)
) ENGINE = InnoDB;
