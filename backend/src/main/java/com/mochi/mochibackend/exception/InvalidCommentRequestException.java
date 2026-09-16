package com.mochi.mochibackend.exception;

/** Thrown when a comment request is malformed — currently just the threaded-reply rules (reply to a nonexistent/wrong-target/already-a-reply comment). */
public class InvalidCommentRequestException extends RuntimeException {

    public InvalidCommentRequestException(String message) {
        super(message);
    }
}
