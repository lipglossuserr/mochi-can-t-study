package com.mochi.mochibackend.exception;

/** Anything that goes wrong reading the file or getting a usable response from the AI — text extraction failure, empty/malformed AI output, or the AI provider being unreachable/unconfigured. */
public class FlashcardGenerationException extends RuntimeException {
    public FlashcardGenerationException(String message) {
        super(message);
    }
}