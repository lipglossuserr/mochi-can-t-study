package com.mochi.mochibackend.exception;

/**
 * Thrown when a community's only remaining ADMIN tries to leave, which
 * would orphan the community (nobody left who can approve join requests,
 * promote a successor, etc.). The admin must promote another member to
 * ADMIN first — that action is a Phase 1 follow-up, not yet implemented.
 */
public class SoleAdminCannotLeaveException extends RuntimeException {

    public SoleAdminCannotLeaveException(String message) {
        super(message);
    }
}
