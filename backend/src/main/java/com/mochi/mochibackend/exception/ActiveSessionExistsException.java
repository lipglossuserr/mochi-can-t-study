package com.mochi.mochibackend.exception;

/** Thrown when starting a session while a RUNNING/PAUSED one exists. Maps to 409. */
public class ActiveSessionExistsException extends RuntimeException {

    public ActiveSessionExistsException(String message) {
        super(message);
    }
}
