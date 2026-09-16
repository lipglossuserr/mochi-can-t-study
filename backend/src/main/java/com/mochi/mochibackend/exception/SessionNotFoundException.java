package com.mochi.mochibackend.exception;

/**
 * Thrown when a study session does not exist or does not belong to the
 * authenticated user. Both cases intentionally produce the same 404 so
 * session ids of other users are never confirmed to exist.
 */
public class SessionNotFoundException extends RuntimeException {

    public SessionNotFoundException(String message) {
        super(message);
    }
}
