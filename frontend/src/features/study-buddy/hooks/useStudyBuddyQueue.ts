import { useCallback, useEffect, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import {
  joinStudyBuddyQueue,
  fetchStudyBuddyQueueStatus,
  leaveStudyBuddyQueue,
  reportStudyBuddyRoom,
} from '../api/studyBuddyService'
import type { StudyBuddyQueueStatus } from '../types/studyBuddy'

const POLL_INTERVAL_MS = 3000

/**
 * Owns the join/poll/leave lifecycle for the study buddy queue. Does
 * NOT create the Firestore room or navigate anywhere — that stays in
 * the component using this hook (see StudyBuddyMatchWidget.tsx),
 * because "what happens once matched" is a UI/routing decision, not
 * queue-state management.
 */
export function useStudyBuddyQueue() {
  const [queueStatus, setQueueStatus] = useState<StudyBuddyQueueStatus | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const poll = useCallback(async () => {
    try {
      const response = await fetchStudyBuddyQueueStatus()
      setQueueStatus(response.data.data)
      if (response.data.data.status !== 'WAITING') {
        stopPolling()
      }
    } catch (err) {
      // A real 404 means "no active entry" — genuinely not queued
      // anymore (expired server-side, or the entry was never created),
      // so stop polling and reflect that in the UI.
      //
      // Any OTHER failure (network hiccup, a timeout, the backend
      // briefly unreachable) is a transient blip, not "you left the
      // queue" — this branch used to call stopPolling() here too,
      // which was a real bug: a single momentary network failure would
      // silently and permanently end the search from the user's
      // perspective (reverting to the idle "find a buddy" form) even
      // though the backend still had them actively queued, with no
      // indication anything went wrong. Now it does nothing and lets
      // the next scheduled poll retry, matching what this comment
      // always claimed the behavior was.
      if (isAxiosError(err) && err.response?.status === 404) {
        setQueueStatus(null)
        stopPolling()
      }
    }
  }, [stopPolling])

  const join = useCallback(
    async (subject: string) => {
      setPending(true)
      setError(null)
      try {
        const response = await joinStudyBuddyQueue(subject)
        setQueueStatus(response.data.data)
        if (response.data.data.status === 'WAITING') {
          stopPolling()
          pollRef.current = setInterval(() => void poll(), POLL_INTERVAL_MS)
        }
      } catch {
        setError("Couldn't join the queue — please try again.")
      } finally {
        setPending(false)
      }
    },
    [poll, stopPolling],
  )

  const leave = useCallback(async () => {
    stopPolling()
    setQueueStatus(null)
    try {
      await leaveStudyBuddyQueue()
    } catch {
      // Already left / already matched by the time this lands — either
      // way the UI has already moved on locally, nothing to reconcile.
    }
  }, [stopPolling])

  /** Called once whichever side's client actually creates the Firestore room — see studyBuddyService.reportStudyBuddyRoom's doc comment. */
  const reportRoom = useCallback(async (roomId: string) => {
    try {
      await reportStudyBuddyRoom(roomId)
      setQueueStatus((current) => (current ? { ...current, roomId } : current))
    } catch {
      // Best-effort hand-off — see StudyBuddyService.reportRoom's own
      // doc comment on why a failed report isn't worth surfacing: the
      // reporting side already has the room id it needs regardless.
    }
  }, [])

  useEffect(() => stopPolling, [stopPolling])

  return { queueStatus, pending, error, join, leave, reportRoom }
}
