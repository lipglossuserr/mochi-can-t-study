-- Study buddy matching (algorithmic pairing for Co-Study Rooms, by
-- free-text subject keyword overlap — see StudyBuddyMatchingService).
-- Lives in MySQL, not Firestore: matching needs a durable, queryable
-- queue with atomic "claim a match" writes, which is exactly what the
-- rest of this schema is for — the co-study room itself still gets
-- created in Firestore as normal once two users are matched (see
-- StudyBuddyEntry's class doc for the room-id hand-off).

CREATE TABLE study_buddy_entries (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_uid VARCHAR(128) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL,
    matched_with_user_uid VARCHAR(128) NULL,
    room_id VARCHAR(128) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    matched_at TIMESTAMP(6) NULL,
    version BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id)
);

CREATE INDEX idx_study_buddy_user_status ON study_buddy_entries (user_uid, status);
CREATE INDEX idx_study_buddy_status_created ON study_buddy_entries (status, created_at);
