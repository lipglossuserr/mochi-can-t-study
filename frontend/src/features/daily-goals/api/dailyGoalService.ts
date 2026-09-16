import type { AxiosResponse } from 'axios'
import api from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api'
import type { DailyGoal, DailyGoalWriteRequest } from '../types/dailyGoal'

/**
 * All /api/daily-goals calls. Uses the shared axios instance from
 * src/api/axiosClient.ts (Firebase ID token already attached there) —
 * same convention as taskService.ts and studySessionService.ts.
 *
 * Sprint 7.4C ships the frontend only; the 7.4A/7.4B backend routes
 * aren't directly inspectable from this repo, so these are written to
 * standard REST semantics for a resource collection, the same
 * documented assumption `taskService.ts` made for its own CRUD routes:
 * `GET /daily-goals` for today's goals, `POST /daily-goals` to create,
 * `PUT /daily-goals/{id}` to replace the editable fields, `DELETE
 * /daily-goals/{id}` to remove. If the real routes differ, this file is
 * the only place that needs to change — every caller goes through here.
 *
 * No `completeGoal`/`reopenGoal` here on purpose — per this sprint's
 * scope, progress and completion are entirely server-derived (e.g. from
 * study sessions or task completions elsewhere hitting a goal's
 * target), never a direct user action the frontend triggers.
 */

/** GET /api/daily-goals — the authenticated user's goals for today. */
export function fetchDailyGoals(): Promise<AxiosResponse<ApiResponse<DailyGoal[]>>> {
  return api.get('/daily-goals')
}

/** POST /api/daily-goals — create a new goal for today. */
export function createDailyGoal(
  payload: DailyGoalWriteRequest,
): Promise<AxiosResponse<ApiResponse<DailyGoal>>> {
  return api.post('/daily-goals', payload)
}

/** PUT /api/daily-goals/{id} — replace an existing goal's editable fields. */
export function updateDailyGoal(
  id: number,
  payload: DailyGoalWriteRequest,
): Promise<AxiosResponse<ApiResponse<DailyGoal>>> {
  return api.put(`/daily-goals/${id}`, payload)
}

/** DELETE /api/daily-goals/{id} — permanently remove a goal. */
export function deleteDailyGoal(id: number): Promise<AxiosResponse<ApiResponse<null>>> {
  return api.delete(`/daily-goals/${id}`)
}
