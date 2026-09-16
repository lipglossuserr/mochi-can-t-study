package com.mochi.mochibackend.community.enums;

/**
 * The kind of a {@code Reaction}. Only {@code UPVOTE} exists in Phase
 * 3, but this is a real enum column (not a boolean "upvotes" table)
 * so a future reaction type — the design doc floats "helpful" for
 * HELP_REQUEST posts as a possible v2 — is an enum value, not a
 * migration.
 */
public enum ReactionType {
    UPVOTE
}
