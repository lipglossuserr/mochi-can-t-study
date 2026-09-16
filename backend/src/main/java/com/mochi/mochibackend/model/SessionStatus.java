package com.mochi.mochibackend.model;

/**
 * State machine for a study session.
 * <p>
 * RUNNING -> PAUSED (pause), PAUSED -> RUNNING (resume),
 * RUNNING/PAUSED -> COMPLETED (timer reached zero),
 * RUNNING/PAUSED -> STOPPED (user pressed Stop).
 * COMPLETED and STOPPED are terminal.
 */
public enum SessionStatus {
    RUNNING,
    PAUSED,
    COMPLETED,
    STOPPED;

    public boolean isFinal() {
        return this == COMPLETED || this == STOPPED;
    }

    public boolean isActive() {
        return this == RUNNING || this == PAUSED;
    }
}
