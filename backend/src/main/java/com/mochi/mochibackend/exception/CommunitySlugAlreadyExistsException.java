package com.mochi.mochibackend.exception;

/** Thrown when a caller-supplied slug (see CreateCommunityRequest.slug) is already taken. */
public class CommunitySlugAlreadyExistsException extends RuntimeException {

    public CommunitySlugAlreadyExistsException(String message) {
        super(message);
    }
}
