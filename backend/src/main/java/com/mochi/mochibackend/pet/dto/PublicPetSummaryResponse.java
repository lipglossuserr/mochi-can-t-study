package com.mochi.mochibackend.pet.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Cosmetic-only view of another user's pet — deliberately a much
 * smaller surface than {@link PetResponse}. No coins, hunger, mood,
 * bond, or streaks: those are private stats, same boundary the
 * leaderboard feature already draws (it only ever shows level/xp, not
 * these). Used for Study Rooms Phase 2 presence tiles, where a room
 * member's pet should be recognizable at a glance without exposing
 * anything they haven't already implicitly shared by being in the
 * room's participant list.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PublicPetSummaryResponse {

    private String uid;
    private String name;
    private String species;
    private String stage;
    private int level;
}
