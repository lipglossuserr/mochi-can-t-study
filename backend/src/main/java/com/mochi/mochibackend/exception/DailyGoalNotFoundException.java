package com.mochi.mochibackend.exception;

/**
 * Thrown when a daily goal does not exist or does not belong to the
 * authenticated user. Both cases intentionally produce the same 404 so
 * goal ids belonging to other users are never confirmed to exist — same
 * rationale as {@code TaskNotFoundException}.
 */
public class DailyGoalNotFoundException extends RuntimeException {

    public DailyGoalNotFoundException(String message) {
        super(message);
    }
}
