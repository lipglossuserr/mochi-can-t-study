import api from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api'
import type { StudyBuddyQueueStatus } from '../types/studyBuddy'

/** POST /api/study-buddy/queue — idempotent; re-calling while already queued just returns the existing entry. */
export function joinStudyBuddyQueue(subject: string) {
  return api.post<ApiResponse<StudyBuddyQueueStatus>>('/study-buddy/queue', { subject })
}

/** GET /api/study-buddy/queue — 404s (via the shared error interceptor's normal axios rejection) if there's no active entry; callers should treat that as "not queued," not a real error. */
export function fetchStudyBuddyQueueStatus() {
  return api.get<ApiResponse<StudyBuddyQueueStatus>>('/study-buddy/queue')
}

/** DELETE /api/study-buddy/queue — voluntary leave while still WAITING. */
export function leaveStudyBuddyQueue() {
  return api.delete<ApiResponse<void>>('/study-buddy/queue')
}

/** POST /api/study-buddy/queue/room — reports the Firestore room id back after a match; see StudyBuddyEntry's backend doc comment on the hand-off. */
export function reportStudyBuddyRoom(roomId: string) {
  return api.post<ApiResponse<void>>('/study-buddy/queue/room', { roomId })
}
