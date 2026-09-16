package com.mochi.mochibackend.exception;

/**
 * Thrown when a request reaches a controller that requires an
 * authenticated Firebase identity, but the security context holds no
 * valid {@code FirebaseAuthenticationToken} — e.g. no bearer token was
 * supplied, or {@code FirebaseAuthenticationFilter} rejected it.
 */
public class InvalidFirebaseTokenException extends RuntimeException {

    public InvalidFirebaseTokenException(String message) {
        super(message);
    }

}
