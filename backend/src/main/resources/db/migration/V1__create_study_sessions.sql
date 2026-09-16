-- Study sessions: one Pomodoro session per row, owned by a Firebase uid.
-- active_marker is TRUE while RUNNING/PAUSED and NULL once finalized;
-- combined with uk_study_sessions_active below, MySQL guarantees at most
-- one active session per user (NULLs are exempt from unique constraints).

CREATE TABLE study_sessions (
    id                          BIGINT       NOT NULL AUTO_INCREMENT,
    user_uid                    VARCHAR(128) NOT NULL,
    task_id                     BIGINT       NULL,
    planned_duration_seconds    INT          NOT NULL,
    accumulated_study_seconds   BIGINT       NOT NULL DEFAULT 0,
    status                      VARCHAR(20)  NOT NULL,
    active_marker               BIT(1)       NULL,
    started_at                  DATETIME(6)  NOT NULL,
    last_resumed_at             DATETIME(6)  NULL,
    paused_at                   DATETIME(6)  NULL,
    ended_at                    DATETIME(6)  NULL,
    total_paused_seconds        BIGINT       NOT NULL DEFAULT 0,
    focused_seconds             BIGINT       NOT NULL DEFAULT 0,
    distracted_seconds          BIGINT       NOT NULL DEFAULT 0,
    no_face_seconds             BIGINT       NOT NULL DEFAULT 0,
    multiple_face_seconds       BIGINT       NOT NULL DEFAULT 0,
    camera_unavailable_seconds  BIGINT       NOT NULL DEFAULT 0,
    focus_score                 INT          NULL,
    session_classification      VARCHAR(20)  NULL,
    completion_ratio            DOUBLE       NULL,
    created_at                  DATETIME(6)  NOT NULL,
    updated_at                  DATETIME(6)  NOT NULL,
    version                     BIGINT       NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_study_sessions_active UNIQUE (user_uid, active_marker),
    INDEX idx_study_sessions_user (user_uid),
    CONSTRAINT chk_planned_duration CHECK (planned_duration_seconds >= 300)
) ENGINE = InnoDB;

-- Aggregated focus-tracking windows. Statistics only — no video, frames,
-- landmarks, coordinates, or biometric data is ever stored.
-- uk_focus_batches_client_id makes duplicate client batches (network
-- retries) structurally impossible to double-count.

CREATE TABLE focus_batches (
    id                          BIGINT       NOT NULL AUTO_INCREMENT,
    study_session_id            BIGINT       NOT NULL,
    client_batch_id             VARCHAR(64)  NOT NULL,
    window_started_at           DATETIME(6)  NOT NULL,
    window_ended_at             DATETIME(6)  NOT NULL,
    focused_millis              BIGINT       NOT NULL DEFAULT 0,
    distracted_millis           BIGINT       NOT NULL DEFAULT 0,
    no_face_millis              BIGINT       NOT NULL DEFAULT 0,
    multiple_face_millis        BIGINT       NOT NULL DEFAULT 0,
    camera_unavailable_millis   BIGINT       NOT NULL DEFAULT 0,
    created_at                  DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_focus_batches_client_id UNIQUE (study_session_id, client_batch_id),
    INDEX idx_focus_batches_session (study_session_id),
    CONSTRAINT fk_focus_batches_session
        FOREIGN KEY (study_session_id) REFERENCES study_sessions (id)
        ON DELETE CASCADE
) ENGINE = InnoDB;
