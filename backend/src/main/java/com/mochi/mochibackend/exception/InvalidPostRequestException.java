package com.mochi.mochibackend.exception;

/** Thrown when a post's type-specific fields are missing or malformed — e.g. a POLL with 1 option, a ROOM_SHARE with no code. */
public class InvalidPostRequestException extends RuntimeException {

    public InvalidPostRequestException(String message) {
        super(message);
    }
}
