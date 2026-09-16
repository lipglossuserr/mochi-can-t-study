-- Adds daily study-streak tracking to pets. current_streak/longest_streak
-- default to 0 and last_study_date to NULL so every existing pet lands in
-- the "no streak yet" state with no backfill needed.
ALTER TABLE pets
    ADD COLUMN current_streak INT NOT NULL DEFAULT 0,
    ADD COLUMN longest_streak INT NOT NULL DEFAULT 0,
    ADD COLUMN last_study_date DATE NULL;
