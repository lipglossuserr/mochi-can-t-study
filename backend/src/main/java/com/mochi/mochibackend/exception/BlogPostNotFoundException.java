package com.mochi.mochibackend.exception;

public class BlogPostNotFoundException extends RuntimeException {

    public BlogPostNotFoundException(String message) {
        super(message);
    }
}
