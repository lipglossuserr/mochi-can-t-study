package com.mochi.mochibackend.exception;

/** Thrown when a session request fails service-level validation (e.g. duration below 5 minutes). Maps to 400. */
public class InvalidSessionRequestException extends RuntimeException {

    public InvalidSessionRequestException(String message) {
        super(message);
    }
}
