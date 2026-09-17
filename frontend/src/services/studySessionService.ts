import type { AxiosResponse } from 'axios'
import api from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api'
import type {
  FocusBatchAck,
  FocusBatchRequest,
  FocusTimelinePoint,
  StartSessionRequest,
  StudySession,
} from '@/types/studySession'

/**
 * All /api/study-sessions calls. Uses the shared axios instance, which
 * attaches the Firebase ID token — nothing here touches auth directly.
 */

type SessionResponse = Promise<AxiosResponse<ApiResponse<StudySession>>>

export function startSession(request: StartSessionRequest): SessionResponse {
  return api.post('/study-sessions/start', request)
}

export function pauseSession(id: number): SessionResponse {
  return api.post(`/study-sessions/${id}/pause`)
}

export function resumeSession(id: number): SessionResponse {
  return api.post(`/study-sessions/${id}/resume`)
}

export function completeSession(id: number): SessionResponse {
  return api.post(`/study-sessions/${id}/complete`)
}

export function stopSession(id: number): SessionResponse {
  return api.post(`/study-sessions/${id}/stop`)
}

/** data is null when the user has no RUNNING/PAUSED session. */
export function fetchActiveSession(): Promise<
  AxiosResponse<ApiResponse<StudySession | null>>
> {
  return api.get('/study-sessions/active')
}

export function fetchSession(id: number): SessionResponse {
  return api.get(`/study-sessions/${id}`)
}

/** Session focus timeline graph — one point per recorded focus batch, oldest first. */
export function fetchFocusTimeline(
  id: number,
): Promise<AxiosResponse<ApiResponse<FocusTimelinePoint[]>>> {
  return api.get(`/study-sessions/${id}/focus-timeline`)
}

export function sendFocusBatch(
  sessionId: number,
  batch: FocusBatchRequest,
): Promise<AxiosResponse<ApiResponse<FocusBatchAck>>> {
  return api.post(`/study-sessions/${sessionId}/focus-batches`, batch)
}
