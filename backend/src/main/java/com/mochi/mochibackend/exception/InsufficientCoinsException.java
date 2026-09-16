package com.mochi.mochibackend.exception;

/**
 * Thrown when a coin-spending request (Shop purchases) asks for more
 * than the pet's current balance. Maps to 409, same family as
 * {@link ActiveSessionExistsException} — a conflict between the request
 * and the caller's current state, not a malformed request or a missing
 * resource.
 */
public class InsufficientCoinsException extends RuntimeException {

    public InsufficientCoinsException(String message) {
        super(message);
    }
}