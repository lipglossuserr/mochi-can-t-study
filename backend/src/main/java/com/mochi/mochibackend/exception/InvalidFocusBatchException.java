package com.mochi.mochibackend.exception;

/** Thrown when a focus batch fails server-side plausibility validation. Maps to 400. */
public class InvalidFocusBatchException extends RuntimeException {

    public InvalidFocusBatchException(String message) {
        super(message);
    }
}
