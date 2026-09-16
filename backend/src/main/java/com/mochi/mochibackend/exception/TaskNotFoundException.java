package com.mochi.mochibackend.exception;

/**
 * Thrown when a task does not exist or does not belong to the
 * authenticated user. Both cases intentionally produce the same 404 so
 * task ids belonging to other users are never confirmed to exist —
 * same rationale as {@code SessionNotFoundException}.
 */
public class TaskNotFoundException extends RuntimeException {

    public TaskNotFoundException(String message) {
        super(message);
    }
}
