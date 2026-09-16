package com.mochi.mochibackend.exception;

public class ChatRateLimitedException extends RuntimeException {

    public ChatRateLimitedException(String message) {
        super(message);
    }
}
