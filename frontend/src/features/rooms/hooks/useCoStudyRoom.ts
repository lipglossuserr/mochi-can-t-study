import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import {
  claimHost,
  joinRoom,
  leaveRoom,
  removeParticipant as removeParticipantDoc,
  RoomFullError,
  RoomUnavailableError,
  sendChatMessage,
  sendHeartbeat,
  startRoomTimer,
  submitReport,
  subscribeToMessages,
  subscribeToParticipants,
  subscribeToRoom,
} from '@/features/rooms/api/roomRepository'
import { muteParticipantOnCall, removeParticipantFromCall } from '@/features/rooms/api/roomSessionService'
import { completeSession, startSession, stopSession } from '@/services/studySessionService'
import type { CoStudyMessage, CoStudyParticipant, CoStudyRoom } from '@/types/coStudyRoom'

const HEARTBEAT_INTERVAL_MS = 15_000
/** A participant with no heartbeat in this long is treated as a ghost and hidden from the tile grid. */
const GHOST_THRESHOLD_MS = 45_000
/** Backend floor (FocusPolicy.MIN_DURATION_SECONDS) — a room's own create-modal already enforces >= 5 min, this is just a defensive clamp. */
const MIN_LINKED_SESSION_MINUTES = 5

export function useCoStudyRoom(
  roomId: string | null,
  self: { userId: string; displayName: string } | null,
  options: { beforeFinalize?: () => Promise<void> } = {},
) {
  const { beforeFinalize } = options
  const [room, setRoom] = useState<CoStudyRoom | null>(null)
  const [participants, setParticipants] = useState<CoStudyParticipant[]>([])
  const [messages, setMessages] = useState<CoStudyMessage[]>([])
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Moderation surface: true once self's own participant doc has disappeared while still joined — i.e. the host removed them, not a normal leave. See the detection effect below for why this needs an "ever seen self" guard against a false positive during the initial join race. */
  const [removedFromRoom, setRemovedFromRoom] = useState(false)
  const everSeenSelfRef = useRef(false)

  // ---- room-linked backend StudySession (Study Rooms Phase 2) ----
  // Firestore owns the shared timer's truth (timerStartedAtMs); this is
  // purely "also tell the real backend I'm studying" so XP/pet rewards
  // fire the same way a solo session's do. Never gates or alters the
  // Firestore-derived countdown below — if linking fails (most likely a
  // 409 because the user already has an active solo session elsewhere),
  // the room experience continues unaffected, just without a reward.
  const [linkedSessionId, setLinkedSessionId] = useState<number | null>(null)
  const [completedSessionId, setCompletedSessionId] = useState<number | null>(null)
  const [sessionLinkError, setSessionLinkError] = useState<string | null>(null)
  const linkedSessionIdRef = useRef<number | null>(null)
  /** Which timerStartedAtMs value we've already attempted to link a session for — prevents a double POST on re-render/host restarting the timer. */
  const linkedForTimerStartRef = useRef<number | null>(null)
  const completeRequestedRef = useRef(false)

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(tick)
  }, [])

  // ---- subscriptions ----
  useEffect(() => {
    if (!roomId) return
    const unsubRoom = subscribeToRoom(roomId, setRoom)
    const unsubParticipants = subscribeToParticipants(roomId, setParticipants)
    const unsubMessages = subscribeToMessages(roomId, setMessages)
    return () => {
      unsubRoom()
      unsubParticipants()
      unsubMessages()
    }
  }, [roomId])

  // Moderation: detect being removed. Checked against the raw
  // `participants` list (not the ghost-filtered one below) — a
  // deletion shows up here immediately, whereas ghosting is just a
  // stale heartbeat and shouldn't be confused with removal.
  // `everSeenSelfRef` guards against the brief window right after
  // joining where the participants snapshot may not have caught up
  // yet — without it, that race would look identical to "removed."
  useEffect(() => {
    if (!self) return
    const stillPresent = participants.some((p) => p.userId === self.userId)
    if (stillPresent) {
      everSeenSelfRef.current = true
      return
    }
    if (joined && everSeenSelfRef.current) {
      setRemovedFromRoom(true)
    }
  }, [participants, self, joined])

  // ---- join on mount, leave on unmount/navigation away ----
  const selfRef = useRef(self)
  selfRef.current = self
  useEffect(() => {
    if (!roomId || !self) return
    let cancelled = false
    joinRoom(roomId, self)
      .then(() => {
        if (!cancelled) setJoined(true)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof RoomFullError) {
          setError("This room is full — try again later or ask the host to make room.")
        } else if (err instanceof RoomUnavailableError) {
          setError("This room isn't available anymore — it may have ended.")
        } else {
          setError("Couldn't join the room — try again in a moment.")
        }
      })
    return () => {
      cancelled = true
      const current = selfRef.current
      if (current) void leaveRoom(roomId, current.userId, current.displayName)
      setJoined(false)

      // Leaving early while a linked session is still RUNNING would
      // otherwise strand it — the backend's one-active-session-per-user
      // constraint would then block starting any new session (in this
      // room or a solo one) until it's finalized. Stop, don't complete:
      // this wasn't a real finish, same distinction StudyRoomPage's own
      // Stop button draws.
      if (linkedSessionIdRef.current != null && !completeRequestedRef.current) {
        const danglingId = linkedSessionIdRef.current
        linkedSessionIdRef.current = null
        void stopSession(danglingId).catch(() => undefined)
      }
    }
  }, [roomId, self])

  // ---- presence heartbeat ----
  useEffect(() => {
    if (!roomId || !joined || !self) return
    const interval = window.setInterval(() => {
      void sendHeartbeat(roomId, self.userId)
    }, HEARTBEAT_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [roomId, joined, self])

  // ---- synced countdown, derived from server-anchored timerStartedAtMs, same discipline as useStudySession's clock-skew correction ----
  useEffect(() => {
    if (!room) {
      setRemainingSeconds(0)
      return
    }
    if (room.timerStartedAtMs == null) {
      setRemainingSeconds(room.timerDurationSeconds)
      return
    }
    const elapsed = Math.floor((now - room.timerStartedAtMs) / 1000)
    setRemainingSeconds(Math.max(0, room.timerDurationSeconds - elapsed))
  }, [room, now])

  // ---- link a real backend StudySession the moment the shared timer starts ----
  // Every participant (host and joiners alike) does this independently
  // on their own client — the room's countdown is shared, but each
  // person's study-time credit and reward are their own, same as the
  // solo flow.
  useEffect(() => {
    if (!room || !self || room.timerStartedAtMs == null) return
    if (linkedForTimerStartRef.current === room.timerStartedAtMs) return
    linkedForTimerStartRef.current = room.timerStartedAtMs
    completeRequestedRef.current = false
    setCompletedSessionId(null)
    setSessionLinkError(null)

    const plannedDurationMinutes = Math.max(
      MIN_LINKED_SESSION_MINUTES,
      Math.round(room.timerDurationSeconds / 60),
    )

    startSession({ plannedDurationMinutes, roomId: room.id })
      .then((response) => {
        const started = response.data.data
        linkedSessionIdRef.current = started.id
        setLinkedSessionId(started.id)
      })
      .catch((err) => {
        // A 409 almost always means an active solo session elsewhere.
        // The room itself (timer/chat/presence) still works fine — the
        // person just won't get pet XP credit for this particular block.
        const message =
          isAxiosError(err) && err.response?.status === 409
            ? "You already have an active study session elsewhere, so this room block won't count toward Mochi's XP."
            : "Couldn't link this session for rewards, but the room timer will still run."
        setSessionLinkError(message)
      })
  }, [room, self])

  // ---- finalize the linked session exactly once the shared countdown reaches zero ----
  useEffect(() => {
    if (remainingSeconds > 0) return
    if (linkedSessionIdRef.current == null || completeRequestedRef.current) return
    const id = linkedSessionIdRef.current
    completeRequestedRef.current = true
    void (async () => {
      await beforeFinalize?.().catch(() => undefined)
      try {
        await completeSession(id)
        setCompletedSessionId(id)
      } catch {
        setSessionLinkError("Couldn't finalize this session's reward — it may show up after a refresh.")
      }
    })()
  }, [remainingSeconds, beforeFinalize])

  const livePresentParticipants = useMemo(
    () => participants.filter((p) => now - p.lastSeenAtMs < GHOST_THRESHOLD_MS),
    [participants, now],
  )

  const isHost = Boolean(room && self && room.hostUserId === self.userId)

  // ---- host-transfer-on-disconnect (moderation surface, roadmap §3.2) ----
  // If the current host's own heartbeat has gone stale (or their doc is
  // gone entirely), the earliest-joined still-live participant
  // self-claims host — never appoints anyone else, matching what the
  // Firestore rule actually allows (see firestore.rules for why). The
  // ref guards against re-claiming every second while the host stays
  // stale; it resets the moment the host looks healthy again so a
  // brief network blip doesn't cause a spurious transfer that then
  // never gets attempted again.
  const hostClaimAttemptedRef = useRef(false)
  useEffect(() => {
    if (!room || !self || !roomId || room.status !== 'active') return
    if (room.hostUserId === self.userId) {
      hostClaimAttemptedRef.current = false
      return
    }
    const hostParticipant = participants.find((p) => p.userId === room.hostUserId)
    const hostIsStale = !hostParticipant || now - hostParticipant.lastSeenAtMs >= GHOST_THRESHOLD_MS
    if (!hostIsStale) {
      hostClaimAttemptedRef.current = false
      return
    }
    if (hostClaimAttemptedRef.current) return
    const earliestLive = livePresentParticipants[0]
    if (!earliestLive || earliestLive.userId !== self.userId) return

    hostClaimAttemptedRef.current = true
    void claimHost(roomId, self.userId).catch(() => {
      hostClaimAttemptedRef.current = false
    })
  }, [room, self, roomId, participants, now, livePresentParticipants])

  const sendMessage = useCallback(
    async (body: string) => {
      if (!roomId || !self) return
      await sendChatMessage(roomId, self, body)
    },
    [roomId, self],
  )

  const startTimer = useCallback(async () => {
    if (!roomId) return
    await startRoomTimer(roomId)
  }, [roomId])

  // ---- moderation actions (host-authorization enforced server/rules-side, not here — see roomSessionService.ts and firestore.rules) ----

  /** Disconnects the target's LiveKit media (best-effort — a 503 just means video isn't configured on this deployment, nothing to remove) and always removes their Firestore presence, which is what actually forces them out of the room UI on their end. */
  const removeParticipant = useCallback(
    async (targetUserId: string) => {
      if (!roomId) return
      await removeParticipantFromCall(roomId, targetUserId).catch(() => undefined)
      await removeParticipantDoc(roomId, targetUserId)
    },
    [roomId],
  )

  const muteParticipant = useCallback(
    async (targetUserId: string, muted: boolean, trackType: 'AUDIO' | 'VIDEO' = 'AUDIO') => {
      if (!roomId) return
      await muteParticipantOnCall(roomId, targetUserId, muted, trackType)
    },
    [roomId],
  )

  const reportParticipant = useCallback(
    async (targetUserId: string, targetDisplayName: string, reason: string) => {
      if (!roomId || !self) return
      await submitReport({
        roomId,
        reporterUserId: self.userId,
        reportedUserId: targetUserId,
        reportedDisplayName: targetDisplayName,
        reason,
      })
    },
    [roomId, self],
  )

  return {
    room,
    participants: livePresentParticipants,
    messages,
    remainingSeconds,
    joined,
    isHost,
    error,
    sendMessage,
    startTimer,
    linkedSessionId,
    completedSessionId,
    sessionLinkError,
    removedFromRoom,
    removeParticipant,
    muteParticipant,
    reportParticipant,
  }
}
