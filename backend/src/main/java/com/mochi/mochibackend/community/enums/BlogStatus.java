package com.mochi.mochibackend.community.enums;

/**
 * Lifecycle of a {@code BlogPost}. Two states only in v1 — no
 * ARCHIVED/SCHEDULED yet, matching the design doc's "keep the editor
 * minimal, resist scope creep" note for the blog layer generally.
 */
public enum BlogStatus {
    DRAFT,
    PUBLISHED
}
