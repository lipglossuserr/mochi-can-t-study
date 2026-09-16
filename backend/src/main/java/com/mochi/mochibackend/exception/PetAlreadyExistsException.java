package com.mochi.mochibackend.exception;

/**
 * Thrown when starter-pet creation is attempted for a uid that already
 * has a pet — including the race where two simultaneous requests both
 * try to provision the first pet (the loser hits the {@code uk_pets_user}
 * unique constraint). Maps to 409.
 */
public class PetAlreadyExistsException extends RuntimeException {

    public PetAlreadyExistsException(String message) {
        super(message);
    }
}
