package com.mochi.mochibackend.exception;

/**
 * Wraps a checked Firestore failure ({@code InterruptedException} /
 * {@code ExecutionException} from the async Firestore client) as an
 * unchecked exception so the repository layer's method signatures stay
 * clean. Distinct from {@link InvalidFirebaseTokenException} — this
 * represents a persistence-layer failure, not an authentication one, so
 * a caller hitting this never has their token/authentication behavior
 * affected.
 */
public class FirestoreOperationException extends RuntimeException {

    public FirestoreOperationException(String message, Throwable cause) {
        super(message, cause);
    }

}
