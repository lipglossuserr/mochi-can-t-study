package com.mochi.mochibackend.exception;

/** Thrown on an illegal state transition (e.g. resuming a RUNNING session). Maps to 409. */
public class InvalidSessionStateException extends RuntimeException {

    public InvalidSessionStateException(String message) {
        super(message);
    }
}
