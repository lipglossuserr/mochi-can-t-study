package com.mochi.mochibackend.leaderboard.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One row of the leaderboard: a user's pet level/xp plus its rank.
 * {@code currentUser} lets the frontend highlight the caller's own row
 * without doing uid comparison client-side. Named without an {@code is}
 * prefix on the field itself so Lombok's generated {@code isCurrentUser()}
 * getter serializes to the matching {@code currentUser} JSON property,
 * rather than Jackson stripping a doubled "is" down to something else.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LeaderboardEntryResponse {

    private int rank;
    private String uid;
    private String username;
    private int level;
    private int xp;
    private boolean currentUser;
}
