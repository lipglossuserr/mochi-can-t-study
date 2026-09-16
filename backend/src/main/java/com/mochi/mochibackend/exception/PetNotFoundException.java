package com.mochi.mochibackend.exception;

/**
 * Thrown when the authenticated user has no pet yet (should not normally
 * happen once {@code GET /api/pet} has provisioned the starter pet on
 * first access) or when a pet operation is attempted for a uid with no
 * pet record. Maps to 404.
 */
public class PetNotFoundException extends RuntimeException {

    public PetNotFoundException(String message) {
        super(message);
    }
}
