-- Study Rooms moderation audit log (roadmap §3.2's "no feedback, no
-- record" gap). One append-only row per MUTE/UNMUTE/REMOVE performed
-- by a room's host, or REPORT filed by any participant — see
-- RoomModerationAction's doc comment for why all four share a table.
--
-- room_id is the Firestore co-study room id, not the LiveKit-namespaced
-- name (see LiveKitRoomNaming) — no FK, since Study Rooms live in
-- Firestore, not MySQL (same cross-store boundary StudyBuddyEntry's
-- room_id column already crosses without an FK, per its class doc).
--
-- track_type is only set for MUTE/UNMUTE rows (audio vs. video once
-- muteParticipant is generalized past audio-only); reason is only set
-- for REPORT rows, mirroring RoomReportInput.reason on the frontend.
-- Both null otherwise rather than split into per-action tables — a
-- single ordered timeline per room is the point of this table.
--
-- No update/delete path is ever expected against this table (see the
-- entity's class doc), so no updated_at/version column, unlike
-- reports or study_buddy_entries which both get mutated in place.

CREATE TABLE room_moderation_log_entries (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    room_id     VARCHAR(128) NOT NULL,
    actor_uid   VARCHAR(128) NOT NULL,
    target_uid  VARCHAR(128) NOT NULL,
    action      VARCHAR(20)  NOT NULL,
    track_type  VARCHAR(10)  NULL,
    reason      VARCHAR(500) NULL,
    created_at  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id)
);

CREATE INDEX idx_room_mod_log_room_created ON room_moderation_log_entries (room_id, created_at);
