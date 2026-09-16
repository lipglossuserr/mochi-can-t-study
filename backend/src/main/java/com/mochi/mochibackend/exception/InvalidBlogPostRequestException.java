package com.mochi.mochibackend.exception;

/** Thrown when a blog post request is malformed — e.g. an empty title/body, or publishing a post with no content. */
public class InvalidBlogPostRequestException extends RuntimeException {

    public InvalidBlogPostRequestException(String message) {
        super(message);
    }
}
