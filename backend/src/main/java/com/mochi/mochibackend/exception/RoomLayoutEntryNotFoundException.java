package com.mochi.mochibackend.exception;

/**
 * Thrown when a {@code PATCH}/{@code DELETE} on {@code /api/room-layout/{id}}
 * references an id that either doesn't exist or doesn't belong to the
 * caller. Maps to 404.
 */
public class RoomLayoutEntryNotFoundException extends RuntimeException {

    public RoomLayoutEntryNotFoundException(String message) {
        super(message);
    }
}
