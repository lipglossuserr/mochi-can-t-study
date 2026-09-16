import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import type {
  CoStudyMessage,
  CoStudyParticipant,
  CoStudyRoom,
  CreateRoomInput,
  RoomReportInput,
} from '@/types/coStudyRoom'

/**
 * All direct Firestore calls for Study Rooms live here — components and
 * the useCoStudyRoom hook never import from 'firebase/firestore'
 * directly, mirroring how services/authService.ts is the only file
 * that touches the Firebase Auth SDK.
 *
 * Collections:
 *   rooms/{roomId}
 *   rooms/{roomId}/participants/{userId}
 *   rooms/{roomId}/messages/{messageId}
 *
 * NOTE (Phase 0 spike, not yet production-hardened):
 * - Firestore must be enabled on this project in the Firebase console.
 * - No security rules are shipped with this prototype yet. Before
 *   Phase 1 ships for real, rules need to require auth on every
 *   write and restrict participant/message writes to the doc's own
 *   userId — see roadmap §4.4. Room codes should be Firestore's own
 *   auto-generated ids (already unguessable) rather than sequential.
 */

const ROOMS = 'rooms'
const PARTICIPANTS = 'participants'
const MESSAGES = 'messages'
const REPORTS = 'reports'

/**
 * Thrown by joinRoom/assertRoomHasCapacity when a room is already at
 * its host-chosen capacity. Matters more now that rooms can be shared
 * as links inside the app's own Community feature — an in-app share
 * can reach far more people at once than the two-tab testing this
 * feature originally shipped with, so "the room quietly lets in a
 * 9th person on a capacity-6 room" stops being a theoretical gap.
 * <p>
 * This is a best-effort check (a count-then-write, not one atomic
 * operation), so a handful of people clicking "Join" in the same
 * instant could still all slip in before any of their counts update —
 * acceptable for a capacity *guideline* on a study room, not
 * appropriate if this were ever gating something security-sensitive.
 */
export class RoomFullError extends Error {
  constructor(roomId: string) {
    super(`Room ${roomId} is already at capacity`)
    this.name = 'RoomFullError'
  }
}

async function assertRoomHasCapacity(roomId: string, capacity: number): Promise<void> {
  const snapshot = await getCountFromServer(collection(db, ROOMS, roomId, PARTICIPANTS))
  if (snapshot.data().count >= capacity) {
    throw new RoomFullError(roomId)
  }
}

/** Thrown by joinRoom when the room doc doesn't exist or has already ended — distinct from RoomFullError so callers can show the right message. */
export class RoomUnavailableError extends Error {
  constructor(roomId: string) {
    super(`Room ${roomId} isn't available to join`)
    this.name = 'RoomUnavailableError'
  }
}

function roomsCol() {
  return collection(db, ROOMS)
}

function participantsCol(roomId: string) {
  return collection(db, ROOMS, roomId, PARTICIPANTS)
}

function messagesCol(roomId: string) {
  return collection(db, ROOMS, roomId, MESSAGES)
}

export async function createRoom(
  input: CreateRoomInput,
  host: { userId: string; displayName: string },
): Promise<string> {
  const ref = await addDoc(roomsCol(), {
    topic: input.topic.trim() || 'Focus session',
    roomType: input.roomType,
    visibility: input.visibility,
    capacity: input.capacity,
    hostUserId: host.userId,
    hostDisplayName: host.displayName,
    status: 'active',
    timerDurationSeconds: input.durationMinutes * 60,
    timerStartedAtMs: null,
    createdAtMs: Date.now(),
    endedAtMs: null,
    tags: input.tags,
    scheduledStartAtMs: input.scheduledStartAtMs ?? null,
    requireAllFinish: input.requireAllFinish ?? false,
  })
  return ref.id
}

/**
 * One-off lookup, not a subscription — Study Rooms Phase 4's
 * join-by-link flow. A link only needs to know "does this room exist
 * and can I show a join button," not live updates; subscribeToRoom
 * (below) takes over once the person actually joins.
 */
export async function getRoomOnce(roomId: string): Promise<CoStudyRoom | null> {
  const snapshot = await getDoc(doc(db, ROOMS, roomId))
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as CoStudyRoom) : null
}

/** Public lobby list — active, public rooms only. Ordered client-side by createdAtMs (avoids a composite index for this prototype). */
export function subscribeToPublicRooms(
  onChange: (rooms: CoStudyRoom[]) => void,
): Unsubscribe {
  const q = query(
    roomsCol(),
    where('status', '==', 'active'),
    where('visibility', '==', 'public'),
  )
  return onSnapshot(q, (snapshot) => {
    const rooms = snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as CoStudyRoom,
    )
    rooms.sort((a, b) => b.createdAtMs - a.createdAtMs)
    onChange(rooms)
  })
}

export function subscribeToRoom(
  roomId: string,
  onChange: (room: CoStudyRoom | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, ROOMS, roomId), (snapshot) => {
    onChange(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as CoStudyRoom) : null)
  })
}

export function subscribeToParticipants(
  roomId: string,
  onChange: (participants: CoStudyParticipant[]) => void,
): Unsubscribe {
  return onSnapshot(participantsCol(roomId), (snapshot) => {
    const participants = snapshot.docs.map((d) => d.data() as CoStudyParticipant)
    participants.sort((a, b) => a.joinedAtMs - b.joinedAtMs)
    onChange(participants)
  })
}

/** Last 100 by insertion order — this is a prototype, not a paginated chat. */
export function subscribeToMessages(
  roomId: string,
  onChange: (messages: CoStudyMessage[]) => void,
): Unsubscribe {
  const q = query(messagesCol(roomId), orderBy('createdAtMs', 'asc'))
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as CoStudyMessage))
  })
}

/**
 * Re-checks the room is actually joinable (exists, still active, has
 * a free seat) immediately before writing the participant doc — not
 * just trusting whatever the caller already believed from a stale
 * lobby snapshot or a link clicked minutes ago. See RoomFullError and
 * RoomUnavailableError for what this can throw.
 */
export async function joinRoom(
  roomId: string,
  participant: { userId: string; displayName: string },
): Promise<void> {
  const roomSnapshot = await getDoc(doc(db, ROOMS, roomId))
  if (!roomSnapshot.exists() || (roomSnapshot.data() as CoStudyRoom).status !== 'active') {
    throw new RoomUnavailableError(roomId)
  }

  const participantRef = doc(db, ROOMS, roomId, PARTICIPANTS, participant.userId)
  const existingParticipant = await getDoc(participantRef)

  // Only a genuinely new join needs a free seat — a reconnect/remount
  // for someone already in the room must never get capacity-locked out
  // by a room that only reads as "full" because they're one of the
  // people filling it.
  if (!existingParticipant.exists()) {
    await assertRoomHasCapacity(roomId, (roomSnapshot.data() as CoStudyRoom).capacity)
  }

  await setDoc(participantRef, {
    userId: participant.userId,
    displayName: participant.displayName,
    cameraEnabled: false,
    joinedAtMs: existingParticipant.exists() ? existingParticipant.data().joinedAtMs : Date.now(),
    lastSeenAtMs: Date.now(),
  })
  await postSystemMessage(roomId, `${participant.displayName} joined the room`)
}

export async function leaveRoom(
  roomId: string,
  userId: string,
  displayName: string,
): Promise<void> {
  await deleteDoc(doc(db, ROOMS, roomId, PARTICIPANTS, userId))
  await postSystemMessage(roomId, `${displayName} left the room`)
}

/** Presence heartbeat — a dropped tab/connection ages out client-side rather than leaving a permanent "ghost" (roadmap §4.3). */
export async function sendHeartbeat(roomId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, ROOMS, roomId, PARTICIPANTS, userId), {
    lastSeenAtMs: Date.now(),
  })
}

/**
 * Study Rooms Phase 3: flips the participant doc's cameraEnabled flag so
 * every other client's participant list can decide whether to render a
 * LiveKit video tile or the Phase-2 pet tile for this person, without
 * anyone needing to be subscribed to LiveKit's own room state to know
 * that. This write is cosmetic/presence-only — it never gates whether
 * LiveKit itself lets the track publish.
 */
export async function setCameraEnabled(
  roomId: string,
  userId: string,
  cameraEnabled: boolean,
): Promise<void> {
  await updateDoc(doc(db, ROOMS, roomId, PARTICIPANTS, userId), {
    cameraEnabled,
  })
}

/**
 * Study Rooms "all must finish" policy. Written once by a participant's
 * own client the moment their focus tracker has read NO_FACE
 * continuously for 10+ minutes (see StudyWithOthersPage's
 * awayContinuousSinceRef). Deliberately write-your-own-violation-only —
 * this never writes to another participant's doc — matching the same
 * "each client only writes its own presence" boundary cameraEnabled
 * and heartbeats already follow. The host's client (any client that is
 * currently host) is what reacts to this by calling voidRoomSessions.
 */
export async function reportDeskAwayViolation(roomId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, ROOMS, roomId, PARTICIPANTS, userId), {
    deskAwayViolation: true,
  })
}

/**
 * Live in-room focus leaderboard. Throttled to ~10s by the caller
 * (StudyWithOthersPage) — this function itself doesn't throttle, it
 * just writes whatever it's given. Write-your-own-doc-only, same as
 * every other presence field.
 */
export async function reportLiveFocusPercent(
  roomId: string,
  userId: string,
  liveFocusPercent: number,
): Promise<void> {
  await updateDoc(doc(db, ROOMS, roomId, PARTICIPANTS, userId), {
    liveFocusPercent,
  })
}

export async function sendChatMessage(
  roomId: string,
  from: { userId: string; displayName: string },
  body: string,
): Promise<void> {
  const trimmed = body.trim()
  if (!trimmed) return
  await addDoc(messagesCol(roomId), {
    userId: from.userId,
    displayName: from.displayName,
    kind: 'chat',
    body: trimmed,
    createdAtMs: Date.now(),
  })
}

export async function postSystemMessage(roomId: string, body: string): Promise<void> {
  await addDoc(messagesCol(roomId), {
    userId: 'system',
    displayName: 'Mochi',
    kind: 'system',
    body,
    createdAtMs: Date.now(),
  })
}

/** Host-only: starts (or restarts) the shared, synced countdown. Every participant computes the same remaining time from timerStartedAtMs — no per-client drift. */
export async function startRoomTimer(roomId: string): Promise<void> {
  await updateDoc(doc(db, ROOMS, roomId), {
    timerStartedAtMs: Date.now(),
  })
}

/** Host-only (enforced by firestore.rules' room-doc update restriction, not by anything here). Pass null to turn ambient sound off for everyone. */
export async function setAmbientSound(
  roomId: string,
  ambientSound: 'rain' | 'brown-noise' | 'cafe' | 'forest' | 'fireplace' | 'library' | null,
): Promise<void> {
  await updateDoc(doc(db, ROOMS, roomId), {
    ambientSound,
  })
}

/**
 * "All must finish" policy — persisted so anyone who reconnects or
 * joins after the violation already happened still sees it (see
 * CoStudyRoom.voidedReason's doc comment for why this can't just be
 * inferred client-side after the fact).
 */
export async function setVoidedReason(roomId: string, reason: string): Promise<void> {
  await updateDoc(doc(db, ROOMS, roomId), {
    voidedReason: reason,
  })
}

export async function endRoom(roomId: string): Promise<void> {
  await updateDoc(doc(db, ROOMS, roomId), {
    status: 'ended',
    endedAtMs: Date.now(),
    // Kept for parity with Firestore's own serverTimestamp() where available.
    _endedAtServer: serverTimestamp(),
  })
}

// ---- moderation surface (roadmap §3.2) ----

/**
 * Host-only "remove participant" — deletes their Firestore presence
 * doc, which forces them out of the room's chat/timer/roster view
 * (see useCoStudyRoom's self-removed detection, which every client
 * runs on its own participants snapshot). Enforced server-side by the
 * Firestore rule on `participants/{userId}` delete (self OR current
 * host), not just by this function's caller doing the right thing.
 * Doesn't touch their LiveKit audio/video connection — pair this with
 * RoomModerationService's removeParticipant (roomSessionService.ts)
 * for that half.
 */
export async function removeParticipant(roomId: string, targetUserId: string): Promise<void> {
  await deleteDoc(doc(db, ROOMS, roomId, PARTICIPANTS, targetUserId))
}

/**
 * Host-transfer-on-disconnect: self-claim only, never appoint someone
 * else — see firestore.rules for why (a rule can cheaply verify "you
 * changed only your own hostUserId claim," not "the old host is
 * actually stale," so the narrower self-only capability is what's
 * enforced server-side). Calling this when you're already host is a
 * harmless no-op write.
 */
export async function claimHost(roomId: string, claimantUserId: string): Promise<void> {
  await updateDoc(doc(db, ROOMS, roomId), {
    hostUserId: claimantUserId,
  })
}

/**
 * Write-only report — see RoomReportInput's doc comment and
 * firestore.rules for the trust boundary (create-only, no client
 * read/update/delete; reviewed via the Firebase console until an
 * in-app moderation UI exists).
 */
export async function submitReport(input: RoomReportInput): Promise<void> {
  await addDoc(collection(db, REPORTS), {
    roomId: input.roomId,
    reporterUserId: input.reporterUserId,
    reportedUserId: input.reportedUserId,
    reportedDisplayName: input.reportedDisplayName,
    reason: input.reason.trim().slice(0, 500),
    createdAtMs: Date.now(),
  })
}
