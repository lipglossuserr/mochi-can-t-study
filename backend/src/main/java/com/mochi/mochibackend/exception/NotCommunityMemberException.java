package com.mochi.mochibackend.exception;

/**
 * Thrown when an action requires the caller to be an APPROVED member of
 * a community (e.g. leaving, viewing the member list) and they aren't.
 */
public class NotCommunityMemberException extends RuntimeException {

    public NotCommunityMemberException(String message) {
        super(message);
    }
}
