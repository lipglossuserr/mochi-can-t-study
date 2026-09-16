package com.mochi.mochibackend.exception;

public class BannedFromCommunityException extends RuntimeException {

    public BannedFromCommunityException(String message) {
        super(message);
    }
}
