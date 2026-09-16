package com.mochi.mochibackend.exception;

public class AlreadyVotedException extends RuntimeException {

    public AlreadyVotedException(String message) {
        super(message);
    }
}
