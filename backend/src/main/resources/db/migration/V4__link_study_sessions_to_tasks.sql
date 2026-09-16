-- Sprint 7.2B: wire study_sessions.task_id (nullable, unconstrained since
-- Sprint 2) to the tasks table created in Sprint 7.2A.
--
-- ON DELETE SET NULL, not CASCADE/RESTRICT: a StudySession is a historical
-- record of time actually spent. Deleting its linked task should not delete
-- or block deletion of that history -- the session just reverts to the
-- pre-7.2B "no linked task" state, which the application already handles.
--
-- No new index: idx_study_sessions_user already covers the app's only
-- lookup path (by owning user); task_id is never queried standalone.

ALTER TABLE study_sessions
    ADD CONSTRAINT fk_study_sessions_task
        FOREIGN KEY (task_id) REFERENCES tasks (id)
        ON DELETE SET NULL;
