package com.mochi.mochibackend.exception;

/**
 * Thrown when {@code POST /api/room-layout} targets an inventory entry
 * that already has a placement. Re-dragging an already-placed item is a
 * reposition, not a new placement — the client should use
 * {@code PATCH /api/room-layout/{id}} instead. Maps to 409, same family
 * as {@link InsufficientCoinsException} — a conflict with the caller's
 * current state, not a malformed request or a missing resource.
 */
public class ItemAlreadyPlacedException extends RuntimeException {

    public ItemAlreadyPlacedException(String message) {
        super(message);
    }
}
