import type { AxiosResponse } from 'axios'
import api from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api'
import type { LeaderboardResponse } from '../types/leaderboard'

/**
 * All /api/leaderboard calls. Uses the shared axios instance from
 * src/api/axiosClient.ts, which already attaches the Firebase ID
 * token — same convention as petService.ts and taskService.ts.
 */

/** GET /api/leaderboard — top 10 by pet level/xp, plus the caller's own rank. */
export function fetchLeaderboard(): Promise<AxiosResponse<ApiResponse<LeaderboardResponse>>> {
  return api.get('/leaderboard')
}
