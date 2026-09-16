package com.mochi.mochibackend.pet.enums;

/**
 * Growth stage of a pet. Every pet starts at {@code BABY}. Evolution
 * between stages is out of scope for this sprint — the enum only models
 * the current stage, it does not yet drive any transition logic.
 */
public enum PetStage {
    BABY,
    CHILD,
    ADULT
}
