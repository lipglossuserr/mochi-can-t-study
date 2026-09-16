package com.mochi.mochibackend.exception;

/**
 * Thrown when a shop purchase or item lookup references an
 * {@code itemId} that doesn't exist in the catalog. Maps to 404.
 */
public class ItemNotFoundException extends RuntimeException {

    public ItemNotFoundException(String message) {
        super(message);
    }
}
