package com.mochi.mochibackend.exception;

public class PollOptionNotFoundException extends RuntimeException {

    public PollOptionNotFoundException(String message) {
        super(message);
    }
}
