package com.mochi.mochibackend.pet.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Public view of a pet. Entities are never exposed from controllers —
 * every response goes through {@code PetMapper}. The client never
 * supplies or sees the internal {@code userId}; ownership is implicit
 * in "this is the caller's pet".
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PetResponse {

    private Long id;
    private String name;
    private String species;
    private String stage;
    private int level;
    private int xp;
    private int coins;
    private int hunger;
    private int mood;
    private int bond;
    private String state;
    private int currentStreak;
    private int longestStreak;
    private String equippedSkin;
    private Instant createdAt;
    private Instant updatedAt;
}
