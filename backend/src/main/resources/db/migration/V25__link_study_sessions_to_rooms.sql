-- Sprint: Study Rooms Phase 2 — link a solo StudySession row to the
-- Firestore co-study room it was started from (rooms/{roomId}), so
-- XP/pet rewards can be attributed to a room and aggregated back into
-- a room-level summary. Nullable: the vast majority of sessions are
-- still solo and never touch a room. No foreign key — the room lives
-- in Firestore, not this database, same cross-store relationship
-- UserRepository already has with UserProfile.
ALTER TABLE study_sessions
    ADD COLUMN room_id VARCHAR(64) NULL AFTER task_id;

CREATE INDEX idx_study_sessions_room ON study_sessions (room_id);
