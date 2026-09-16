package com.mochi.mochibackend.model;

/**
 * The Firebase sign-in provider a user authenticated with.
 * <p>
 * Stored on {@link User} for future use. No logic reads or derives this
 * value yet — it is not populated by any current code path.
 */
public enum AuthProvider {
    EMAIL_PASSWORD,
    GOOGLE
}
