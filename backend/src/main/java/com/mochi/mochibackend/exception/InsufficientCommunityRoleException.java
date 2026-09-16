package com.mochi.mochibackend.exception;

/**
 * Thrown when an action requires MODERATOR/ADMIN standing within a
 * specific community (approving/rejecting join requests, viewing the
 * pending queue) and the caller's role in that community doesn't qualify.
 */
public class InsufficientCommunityRoleException extends RuntimeException {

    public InsufficientCommunityRoleException(String message) {
        super(message);
    }
}
