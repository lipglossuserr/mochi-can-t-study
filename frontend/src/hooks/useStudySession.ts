import { useCallback, useEffect, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import {
  completeSession,
  fetchActiveSession,
  pauseSession,
  resumeSession,
  startSession,
  stopSession,
} from '@/services/studySessionService'
import type { StudySession } from '@/types/studySession'
import { focusConfig } from '@/config/focusConfig'

/**
 * Owns the study-session lifecycle on the client.
 *
 * Timekeeping rules (per project requirements):
 * - The backend's timestamps are the source of truth. The countdown is
 *   derived from Date.now() plus the server-provided timing data — never
 *   from a naive `remaining--` loop, so tab throttling, sleep, refreshes,
 *   and slow networks cannot drift the clock.
 * - Clock skew between this machine and the server is measured on every
 *   response (serverTime vs Date.now()) and corrected for.
 * - When the countdown reaches zero the complete endpoint is called
 *   exactly once (guarded by a ref), after the caller-provided
 *   beforeComplete callback has flushed the final focus batch.
 */
export function useStudySession(options: {
  /** Flush pending focus data before complete/stop finalize the session. */
  beforeFinalize?: () => Promise<void>
}) {
  const { beforeFinalize } = options

  const [session, setSession] = useState<StudySession | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionPending, setActionPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Date.now() - serverTime, measured at the last successful sync. */
  const clockSkewMsRef = useRef(0)
  /** Guards against duplicate auto-complete calls when the timer hits 0. */
  const completeRequestedRef = useRef(false)
  const sessionRef = useRef<StudySession | null>(null)

  const syncFromSession = useCallback((next: StudySession | null) => {
    sessionRef.current = next
    setSession(next)
    if (next) {
      clockSkewMsRef.current = Date.now() - Date.parse(next.serverTime)
      if (next.status === 'RUNNING' || next.status === 'PAUSED') {
        completeRequestedRef.current = false
      }
      // Seed the display immediately from the server's own calculation so
      // no effect ever observes a stale 0 for a session that just started.
      setRemainingSeconds(next.remainingSeconds)
    } else {
      setRemainingSeconds(0)
    }
  }, [])

  /** Remaining time derived purely from server timestamps + corrected now. */
  const computeRemaining = useCallback((): number => {
    const current = sessionRef.current
    if (!current) return 0

    let studied = current.accumulatedStudySeconds
    if (current.status === 'RUNNING' && current.lastResumedAt) {
      const serverNowMs = Date.now() - clockSkewMsRef.current
      const elapsed = (serverNowMs - Date.parse(current.lastResumedAt)) / 1000
      studied += Math.max(0, elapsed)
    }
    return Math.max(0, current.plannedDurationSeconds - studied)
  }, [])

  const describeError = (err: unknown, fallback: string): string => {
    if (isAxiosError(err)) {
      if (!err.response) {
        return 'Cannot reach the server. Check that the backend is running, then try again.'
      }
      if (err.response.status === 401) {
        return 'Your login has expired. Please sign in again.'
      }
      const message = (err.response.data as { message?: string })?.message
      if (message) return message
    }
    return fallback
  }

  /** Refresh recovery: restore any RUNNING/PAUSED session from the server. */
  const loadActive = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchActiveSession()
      syncFromSession(response.data.data)
    } catch (err) {
      setError(describeError(err, 'Could not check for an active session.'))
    } finally {
      setLoading(false)
    }
  }, [syncFromSession])

  useEffect(() => {
    loadActive()
  }, [loadActive])

  /** UI display tick only — never the source of truth. */
  useEffect(() => {
    setRemainingSeconds(computeRemaining())
    if (!session || (session.status !== 'RUNNING' && session.status !== 'PAUSED')) {
      return
    }
    const interval = window.setInterval(() => {
      setRemainingSeconds(computeRemaining())
    }, focusConfig.UI_TICK_MS)
    return () => window.clearInterval(interval)
  }, [session, computeRemaining])

  const runAction = useCallback(
      async (
          action: () => Promise<{ data: { data: StudySession | null } }>,
          fallbackMessage: string,
      ) => {
        setActionPending(true)
        setError(null)
        try {
          const response = await action()
          syncFromSession(response.data.data)
        } catch (err) {
          // A 409 usually means another tab changed the session — re-sync
          // instead of silently discarding the active session.
          if (isAxiosError(err) && err.response?.status === 409) {
            await loadActive()
          }
          setError(describeError(err, fallbackMessage))
        } finally {
          setActionPending(false)
        }
      },
      [loadActive, syncFromSession],
  )

  const start = useCallback(
      (minutes: number, taskId?: number | null) => {
        if (minutes < focusConfig.MIN_DURATION_MINUTES) {
          setError(
              `Study sessions need at least ${focusConfig.MIN_DURATION_MINUTES} minutes.`,
          )
          return Promise.resolve()
        }
        return runAction(
            () => startSession({ plannedDurationMinutes: minutes, taskId: taskId ?? null }),
            'Could not start the session.',
        )
      },
      [runAction],
  )

  const pause = useCallback(async () => {
    const id = sessionRef.current?.id
    if (!id) return
    await beforeFinalize?.().catch(() => undefined)
    await runAction(() => pauseSession(id), 'Could not pause the session.')
  }, [runAction, beforeFinalize])

  const resume = useCallback(() => {
    const id = sessionRef.current?.id
    if (!id) return Promise.resolve()
    return runAction(() => resumeSession(id), 'Could not resume the session.')
  }, [runAction])

  const stop = useCallback(async () => {
    const id = sessionRef.current?.id
    if (!id) return
    completeRequestedRef.current = true // a finalization is in flight
    await beforeFinalize?.().catch(() => undefined)
    await runAction(() => stopSession(id), 'Could not stop the session.')
  }, [runAction, beforeFinalize])

  const complete = useCallback(async () => {
    const id = sessionRef.current?.id
    if (!id) return
    await beforeFinalize?.().catch(() => undefined)
    await runAction(() => completeSession(id), 'Could not complete the session.')
  }, [runAction, beforeFinalize])

  /** Auto-complete exactly once when a RUNNING timer truly reaches zero. */
  useEffect(() => {
    if (
        session?.status === 'RUNNING' &&
        remainingSeconds <= 0 &&
        computeRemaining() <= 0 && // authoritative re-check from server timestamps
        !completeRequestedRef.current
    ) {
      completeRequestedRef.current = true
      complete()
    }
  }, [session, remainingSeconds, computeRemaining, complete])

  /** Clear a finalized session from view (after the summary is dismissed). */
  const reset = useCallback(() => {
    sessionRef.current = null
    setSession(null)
    completeRequestedRef.current = false
    setError(null)
  }, [])

  return {
    session,
    remainingSeconds,
    loading,
    actionPending,
    error,
    start,
    pause,
    resume,
    stop,
    reset,
    reload: loadActive,
  }
}