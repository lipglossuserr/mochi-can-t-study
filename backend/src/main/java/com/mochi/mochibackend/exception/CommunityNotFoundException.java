package com.mochi.mochibackend.exception;

/** Thrown when a community slug doesn't match any existing community. */
public class CommunityNotFoundException extends RuntimeException {

    public CommunityNotFoundException(String message) {
        super(message);
    }
}
