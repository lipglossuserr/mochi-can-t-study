package com.mochi.mochibackend.pet.enums;

/**
 * The pet's current activity/animation state. This sprint only ever
 * sets {@code IDLE} (starter pet default); the remaining values exist so
 * the schema and DTOs are ready for later sprints (study integration,
 * play/feed animations, etc.) without another migration.
 */
public enum PetState {
    IDLE,
    STUDYING,
    PLAYING,
    SLEEPING,
    HUNGRY,
    WAITING,
    HAPPY,
    CELEBRATING
}
