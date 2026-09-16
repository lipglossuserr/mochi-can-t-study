import type { AxiosResponse } from 'axios'
import api from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api'
import type { Achievement } from '../types/achievement'

/**
 * All /api/achievements calls. Uses the shared axios instance from
 * src/api/axiosClient.ts, which already attaches the Firebase ID
 * token — same convention as petService.ts and taskService.ts.
 *
 * Read-only on purpose: unlocking is a side effect of completing a
 * study session or task on the backend (`AchievementService.checkAndUnlock`),
 * never a direct frontend call.
 */

/** GET /api/achievements/me — the full catalog, with this user's unlock state. */
export function fetchAchievements(): Promise<AxiosResponse<ApiResponse<Achievement[]>>> {
  return api.get('/achievements/me')
}
