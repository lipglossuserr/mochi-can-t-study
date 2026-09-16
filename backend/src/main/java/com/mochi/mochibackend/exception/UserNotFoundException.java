package com.mochi.mochibackend.exception;

/**
 * Thrown when a request is authenticated by Firebase (a valid uid is
 * present) but no corresponding application user record exists yet.
 */
public class UserNotFoundException extends RuntimeException {

    public UserNotFoundException(String message) {
        super(message);
    }

}
