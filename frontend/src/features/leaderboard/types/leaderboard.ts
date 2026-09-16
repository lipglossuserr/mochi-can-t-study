/**
 * Shape of GET /api/leaderboard, as returned by `LeaderboardController` /
 * `LeaderboardResponse.java`. Ranked by pet level (xp as tiebreaker) —
 * the same two numbers already shown on the Profile stats card, so the
 * leaderboard never disagrees with what a user sees about their own
 * progress.
 */
export interface LeaderboardEntry {
  rank: number
  uid: string
  username: string
  level: number
  xp: number
  currentUser: boolean
}

/**
 * `me` is always present, even when the caller is outside the top 10 —
 * the backend computes their real rank separately rather than making
 * the frontend guess. When the caller *is* in `topEntries`, `me` is the
 * same entry duplicated there, so this component never needs an
 * "is this rank == my rank" branch.
 */
export interface LeaderboardResponse {
  topEntries: LeaderboardEntry[]
  me: LeaderboardEntry
}
