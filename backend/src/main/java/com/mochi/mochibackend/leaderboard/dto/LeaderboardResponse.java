package com.mochi.mochibackend.leaderboard.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * Top-10 leaderboard plus the calling user's own entry.
 * <p>
 * {@code me} is included separately (not just left to be found inside
 * {@code topEntries}) because a user is very often outside the top 10 —
 * the frontend still wants to show "you're #47" without a second
 * request. When the caller does happen to be in {@code topEntries},
 * {@code me} is the same entry duplicated there for a simpler frontend
 * (no "is this rank == my rank" branching needed).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LeaderboardResponse {

    private List<LeaderboardEntryResponse> topEntries;
    private LeaderboardEntryResponse me;
}
