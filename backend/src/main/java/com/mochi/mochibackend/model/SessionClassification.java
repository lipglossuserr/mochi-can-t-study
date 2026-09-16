package com.mochi.mochibackend.model;

/**
 * Final quality classification of a study session, computed exclusively
 * on the server at finalization time (never accepted from the client).
 * Thresholds live in {@link com.mochi.mochibackend.config.FocusPolicy}.
 */
public enum SessionClassification {
    VALID,
    PARTIAL,
    INVALID
}
