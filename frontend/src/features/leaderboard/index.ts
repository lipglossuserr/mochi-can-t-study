/**
 * Public surface of the leaderboard feature. Mirrors the barrel
 * pattern `features/tasks/index.ts` establishes: everything outside
 * this folder imports from here.
 */
export { useLeaderboard } from './hooks/useLeaderboard'
export { fetchLeaderboard } from './api/leaderboardService'
export type { LeaderboardEntry, LeaderboardResponse } from './types/leaderboard'
