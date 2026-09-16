package com.mochi.mochibackend.exception;

/**
 * Thrown when an approve/reject action targets a membership row that
 * either doesn't exist or isn't currently PENDING — both cases mean
 * "there is nothing here for you to decide."
 */
public class MembershipRequestNotFoundException extends RuntimeException {

    public MembershipRequestNotFoundException(String message) {
        super(message);
    }
}
