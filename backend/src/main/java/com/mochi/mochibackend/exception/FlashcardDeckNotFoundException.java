package com.mochi.mochibackend.exception;

public class FlashcardDeckNotFoundException extends RuntimeException {
    public FlashcardDeckNotFoundException(String message) {
        super(message);
    }
}