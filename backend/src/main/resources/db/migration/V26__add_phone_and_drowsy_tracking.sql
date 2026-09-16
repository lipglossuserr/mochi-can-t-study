-- Extends focus tracking beyond presence/position: phone pickup (hand
-- detected near the face, sustained) and drowsy/eyes-closed (blendshape
-- eye-closure score, sustained). Same statistics-only discipline as
-- every other focus column here — no images, landmarks, or coordinates
-- are ever stored, only millisecond/second duration totals.

ALTER TABLE focus_batches
    ADD COLUMN phone_millis  BIGINT NOT NULL DEFAULT 0 AFTER camera_unavailable_millis,
    ADD COLUMN drowsy_millis BIGINT NOT NULL DEFAULT 0 AFTER phone_millis;

ALTER TABLE study_sessions
    ADD COLUMN phone_seconds  BIGINT NOT NULL DEFAULT 0 AFTER camera_unavailable_seconds,
    ADD COLUMN drowsy_seconds BIGINT NOT NULL DEFAULT 0 AFTER phone_seconds;
