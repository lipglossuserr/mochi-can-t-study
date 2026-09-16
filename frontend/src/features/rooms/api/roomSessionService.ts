import type { AxiosResponse } from 'axios'
import api from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api'
import type {
  PublicPetSummary,
  RoomAnalytics,
  RoomModerationLogEntry,
  RoomSessionSummary,
  VideoTokenPayload,
} from '@/types/coStudyRoom'

/**
 * Study Rooms Phase 2's two backend (MySQL-side) touchpoints. Everything
 * else about a room — chat, presence, the shared timer — stays on
 * Firestore via roomRepository.ts; these are the only calls that go
 * through the Spring backend, so they get their own file rather than
 * living in roomRepository.ts, mirroring how that file is scoped to
 * "touches the Firestore SDK" specifically.
 */

/** GET /api/study-sessions/room/{roomId}/summary — aggregated recap across every participant's linked session. */
export function fetchRoomSessionSummary(
  roomId: string,
): Promise<AxiosResponse<ApiResponse<RoomSessionSummary>>> {
  return api.get(`/study-sessions/room/${roomId}/summary`)
}

/**
 * POST /api/pet/public-batch — cosmetic-only pet info for a room's
 * participant tiles. Capped server-side at 20 uids; callers should
 * chunk if a room's capacity is ever raised past that.
 */
export function fetchPublicPets(
  uids: string[],
): Promise<AxiosResponse<ApiResponse<PublicPetSummary[]>>> {
  return api.post('/pet/public-batch', { uids })
}

/**
 * POST /api/video/rooms/{roomId}/token — Study Rooms Phase 3. Issues a
 * short-lived LiveKit access token scoped to this room and the calling
 * user's identity. A 503 means video isn't configured on this
 * deployment yet (no LiveKit project wired up) — callers should treat
 * that as "camera feature unavailable", not a hard error.
 */
export function fetchVideoToken(
  roomId: string,
  displayName: string,
): Promise<AxiosResponse<ApiResponse<VideoTokenPayload>>> {
  return api.post(`/video/rooms/${roomId}/token`, { displayName })
}

/**
 * GET /api/study-sessions/room-analytics — Study Rooms Phase 5.
 * Always the caller's own history; there's no roomId or userId
 * parameter, unlike fetchRoomSessionSummary above which is
 * intentionally cross-user for a given room.
 */
export function fetchRoomAnalytics(): Promise<AxiosResponse<ApiResponse<RoomAnalytics>>> {
  return api.get('/study-sessions/room-analytics')
}

/**
 * POST /api/study-sessions/room/{roomId}/void — Study Rooms "all must
 * finish" policy. Host-authorization-checked server-side (same 403
 * convention as the moderation calls below): the caller must currently
 * be the room's host, re-verified against Firestore on every call, not
 * just whoever created the room originally (host can change via
 * host-transfer-on-disconnect). Bulk-stops every still-active session
 * in the room at once — no one gets a reward for that session.
 */
export function voidRoomSessions(roomId: string): Promise<AxiosResponse<ApiResponse<unknown>>> {
  return api.post(`/study-sessions/room/${roomId}/void`)
}

// ---- moderation surface (roadmap §3.2) ----
// Both host-authorization-checked server-side by
// RoomModerationController — a 403 here means the backend disagreed
// that the caller is the room's host (e.g. a stale client after a
// host-transfer), not a bug in the button being shown.

/**
 * DELETE /api/video/rooms/{roomId}/participants/{identity} —
 * disconnects the target from the room's LiveKit media session. This
 * is the LiveKit half of "remove participant"; pair with
 * roomRepository.removeParticipant for the Firestore half (kicking
 * them out of chat/timer/roster too).
 */
export function removeParticipantFromCall(
  roomId: string,
  identity: string,
): Promise<AxiosResponse<ApiResponse<void>>> {
  return api.delete(`/video/rooms/${roomId}/participants/${identity}`)
}

/**
 * POST /api/video/rooms/{roomId}/participants/{identity}/mute —
 * force-mutes (or unmutes) the target's microphone (`trackType:
 * 'AUDIO'`, the default) or camera (`'VIDEO'`, the "turn off camera"
 * action) — see `MuteParticipantRequest`'s javadoc on the backend.
 */
export function muteParticipantOnCall(
  roomId: string,
  identity: string,
  muted: boolean,
  trackType: 'AUDIO' | 'VIDEO' = 'AUDIO',
): Promise<AxiosResponse<ApiResponse<void>>> {
  return api.post(`/video/rooms/${roomId}/participants/${identity}/mute`, { muted, trackType })
}

/**
 * GET /api/video/rooms/{roomId}/moderation-log — the room's full
 * moderation timeline, most recent first. Host-only server-side, same
 * 403-means-stale-host convention as the rest of this section.
 */
export function fetchModerationLog(
  roomId: string,
): Promise<AxiosResponse<ApiResponse<RoomModerationLogEntry[]>>> {
  return api.get(`/video/rooms/${roomId}/moderation-log`)
}
