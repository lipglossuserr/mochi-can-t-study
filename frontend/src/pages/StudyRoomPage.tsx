import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStudySession } from '@/hooks/useStudySession'
import { useFocusTracker } from '@/hooks/useFocusTracker'
import { focusConfig } from '@/config/focusConfig'
import Toast from '@/components/Toast'
import { usePet } from '@/features/pet/hooks/usePet'
import { characterEvents, Character, StudyPropsLayer, useCharacter } from '@/features/character'
import { useTasks } from '@/features/tasks'
import PetSpeechBubble from '@/features/pet/components/PetSpeechBubble'
import DurationSelector from '@/components/study/DurationSelector'
import TaskSelector from '@/components/study/TaskSelector'
import LinkedTaskBadge from '@/components/study/LinkedTaskBadge'
import SessionProgress from '@/components/study/SessionProgress'
import TimerControls from '@/components/study/TimerControls'
import SessionSummary from '@/components/study/SessionSummary'
import WebcamFocusTracker from '@/components/study/WebcamFocusTracker'

/** Local-only pre-session countdown length, in seconds. No backend session exists yet at this point. */
const COUNTDOWN_FROM = 3
const COUNTDOWN_TICK_MS = 800

/**
 * The Study Room: the individual study-session workspace.
 *
 * Integration flow (Phase 5):
 * open → check for an active backend session → restore it if present →
 * pick ≥5 minutes → a short local countdown → Start creates the
 * session → timer + camera start → focus batches stream every ~15s →
 * pause/resume drive both systems → stop/zero flushes focus data,
 * finalizes on the server, and the server-calculated result is
 * displayed.
 *
 * Mochi companion integration: a single persistent <Character/> (the
 * same component and engine used everywhere else in the app — see
 * features/character) stays visible through every phase below —
 * ready, countdown, active, and summary — rather than appearing only
 * in one of them. This screen never touches an animation name or a
 * renderer directly; it only emits high-level facts via
 * `characterEvents`, exactly like the rest of the app already does.
 * CharacterEngine (engine/CharacterEngine.ts, wireEvents()) is the one
 * place that decides what those facts mean for Mochi's state — pause
 * reuses the existing sleep() action (the confirmed Break clip already
 * reads as "taking a break"), completion reuses celebrate() unless the
 * session was invalid, and the pre-session countdown reuses the
 * existing 'curiosity-pause' procedural state. Nothing here duplicates
 * that logic or invents a new render path.
 */
function StudyRoomPage() {
  const [minutes, setMinutes] = useState(25)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [confirmingStop, setConfirmingStop] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)

  // Sprint 7.2C: the task picker on the "ready" screen. Loaded once on
  // mount, same as every other list this page reads — a failed fetch
  // just hides the picker (see TaskSelector) rather than blocking the
  // page, since linking a task is optional.
  const { tasks, loading: tasksLoading, error: tasksError } = useTasks()

  // The tracker's flush is wired into the session hook via a ref so the
  // final focus batch always lands before pause/stop/complete finalize.
  const flushRef = useRef<() => Promise<void>>(() => Promise.resolve())

  const {
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
  } = useStudySession({ beforeFinalize: () => flushRef.current() })

  const isActive = session?.status === 'RUNNING' || session?.status === 'PAUSED'
  const isFinal = session?.status === 'COMPLETED' || session?.status === 'STOPPED'
  const isCountingDown = countdown !== null

  // Sprint 7.2C: resolve the running session's linked task (if any) back
  // to a title for display — the session only ever carries the id, same
  // as the backend's own StudySession.taskId.
  const linkedTaskTitle = session?.taskId
      ? (tasks.find((task) => task.id === session.taskId)?.title ?? null)
      : null

  const { pet, celebrateStudyReward } = usePet()
  // Sprint 6.7A-4: the engine's own contextual study-companion speech
  // (session start/resume/pause/long-focus/completion/streak — see
  // CharacterEngine's wireEvents()) — same pipeline HomeRoomPage already
  // reads (Sprint 5.3B's ambient-thought mechanism), just not wired into
  // this screen until now.
  const { thought } = useCharacter()
  // First-time nudge on the "ready to start" screen: the backend doesn't
  // expose a session-history count, so this is a light heuristic off the
  // pet's own untouched baseline stats rather than a new API call.
  const isBrandNewPet = Boolean(pet && pet.level <= 1 && pet.xp === 0 && pet.coins === 0)

  // ---- local pre-session countdown (client-only; no backend session exists yet) ----
  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      setCountdown(null)
      void start(minutes, selectedTaskId)
      return
    }
    const timer = window.setTimeout(() => setCountdown((current) => (current ?? 1) - 1), COUNTDOWN_TICK_MS)
    return () => window.clearTimeout(timer)
  }, [countdown, minutes, selectedTaskId, start])

  const beginCountdown = () => {
    characterEvents.emit({ type: 'study-countdown-started' })
    setCountdown(COUNTDOWN_FROM)
  }

  // Announce session lifecycle to the character engine as high-level
  // events. No screen here knows (or will ever know) an animation name:
  // starting (or resuming — the same 'RUNNING' status covers both)
  // makes Mochi study, pausing settles them into a break, and
  // finalizing reports whether the app is calling this one a genuine
  // win — the engine decides what to actually show for each.
  const announcedStatusRef = useRef<string | null>(null)
  useEffect(() => {
    const key = session ? `${session.id}:${session.status}` : null
    if (key === announcedStatusRef.current) return
    announcedStatusRef.current = key
    if (!session) return
    if (session.status === 'RUNNING') {
      characterEvents.emit({ type: 'study-session-started' })
    } else if (session.status === 'PAUSED') {
      characterEvents.emit({ type: 'timer-paused' })
    } else {
      const classification = session.sessionClassification
          ? (session.sessionClassification.toLowerCase() as 'valid' | 'partial' | 'invalid')
          : null
      characterEvents.emit({ type: 'study-session-completed', classification })
    }
  }, [session])

  // Refresh the pet and show any reward panel exactly once per finalized
  // session, whichever way it ended (completed or stopped early). This
  // ref guard avoids redundant calls on every re-render of THIS mounted
  // instance; celebrateStudyReward's own persisted dedup (rewardPipeline.ts)
  // additionally covers a refresh or an away-and-back navigation, which
  // would reset this ref along with the rest of the component.
  const celebratedSessionIdRef = useRef<number | null>(null)
  useEffect(() => {
    if (isFinal && session && celebratedSessionIdRef.current !== session.id) {
      celebratedSessionIdRef.current = session.id
      void celebrateStudyReward(session.id)
    }
  }, [isFinal, session, celebrateStudyReward])

  const { videoRef, cameraState, liveTotals, startCamera, stopCamera, flush } =
      useFocusTracker({
        sessionId: session?.id ?? null,
        monitoring: session?.status === 'RUNNING',
        // Sprint: smarter focus detection. A held thumbs-up opens the
        // same confirm dialog the Stop button does — ending a session
        // is consequential enough that a gesture (which can misfire)
        // should never skip the confirmation a manual click gets.
        onGestureEndSession: () => setConfirmingStop(true),
        onGesturePauseToggle: () => {
          if (session?.status === 'RUNNING') void pause()
          else if (session?.status === 'PAUSED') void resume()
        },
        onPostureNudge: () => characterEvents.emit({ type: 'posture-nudge-suggested' }),
      })

  useEffect(() => {
    flushRef.current = flush
  }, [flush])

  // Camera starts the moment a session is RUNNING (fresh start or a
  // restored session after refresh — the browser re-asks permission).
  useEffect(() => {
    if (session?.status === 'RUNNING') {
      void startCamera()
    }
  }, [session?.status, startCamera])

  // Finalized sessions release the camera. Focus data was already
  // flushed before finalization, so no post-finalize flush is sent.
  useEffect(() => {
    if (isFinal) {
      void stopCamera(false)
    }
  }, [isFinal, stopCamera])

  const usableMs =
      liveTotals.focused + liveTotals.distracted + liveTotals.noFace + liveTotals.multipleFace
  const liveFocusScore =
      usableMs > 0 ? Math.round((liveTotals.focused / usableMs) * 100) : null

  // Sprint 6.7A-4: "looks toward the webcam briefly after focus
  // recovery" — a high-level fact, same pattern as every other
  // characterEvents emission on this screen: this only reports that
  // cameraState came back to FOCUSED from a distracted/no-face/multi-
  // face state; CharacterEngine decides what that means visually
  // (a brief scripted glance — see STUDY_GLANCE_TARGETS.webcam).
  const previousCameraStateRef = useRef(cameraState)
  useEffect(() => {
    const previous = previousCameraStateRef.current
    previousCameraStateRef.current = cameraState
    const wasUnfocused =
      previous === 'DISTRACTED' ||
      previous === 'NO_FACE' ||
      previous === 'MULTIPLE_FACES' ||
      previous === 'DROWSY' ||
      previous === 'PHONE'
    if (wasUnfocused && cameraState === 'FOCUSED') {
      characterEvents.emit({ type: 'study-focus-recovered' })
    }
  }, [cameraState])

  const handleStopConfirmed = async () => {
    setConfirmingStop(false)
    await stop()
  }

  // Sprint 7.2C: the task selection is only meaningful for the next
  // session about to start — clear it once this one is done with,
  // whether it completed normally or was stopped early.
  const handleSessionDismiss = () => {
    setSelectedTaskId(null)
    reset()
  }

  // Page-level copy only — never an animation name or engine state.
  // Purely reflects what's already true from `session`/`countdown` above.
  const companionCaption = (() => {
    if (isCountingDown) return `Getting comfy… starting in ${countdown}`
    if (session?.status === 'PAUSED') return 'Taking a little break ♡'
    if (session?.status === 'RUNNING') return "I'm right here while you focus"
    if (isFinal && session) {
      const classification = session.sessionClassification
      if (classification === 'VALID') return 'You did it! So proud of you ♡'
      if (classification === 'PARTIAL') return 'Nice effort — every focused minute counts'
      return "That's okay — fresh start next time"
    }
    return isBrandNewPet ? 'Our first session together ♡' : 'Ready when you are ♡'
  })()

  return (
      <div className="mx-auto w-full max-w-6xl">
        {error && (
            <div className="mx-auto mt-6 w-full max-w-md">
              <Toast message={error} />
            </div>
        )}

        <main className="mt-2 w-full">
          {loading ? (
              <p className="text-center font-body text-ink/50">
                Checking for an unfinished session…
              </p>
          ) : (
              <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center lg:gap-12">
                {/* Persistent Mochi companion — one mount, visible through
                every phase (ready, countdown, active, summary). */}
                <motion.aside
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="flex flex-col items-center gap-2 lg:sticky lg:top-6"
                >
                  <div className="relative h-40 w-40 sm:h-48 sm:w-48">
                    <Character />
                    {/* Sprint 6.7A-3: notebook/books/mug — appear only while
                    studying, via composeMotion's studyProps directives. */}
                    <StudyPropsLayer />
                    <PetSpeechBubble
                        message={thought ?? companionCaption}
                        className="left-1/2 top-0 -translate-x-1/2 -translate-y-[calc(100%+0.5rem)]"
                        autoHideMs={isCountingDown ? 900 : 3200}
                    />
                  </div>
                </motion.aside>

                <div className="w-full flex-1">
                  {isFinal && session ? (
                      // ===== CHANGED: this line now also passes linkedTaskTitle (used to just be session + onDismiss) =====
                      <SessionSummary session={session} linkedTaskTitle={linkedTaskTitle} onDismiss={handleSessionDismiss} />
                  ) : isActive && session ? (
                      <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-start lg:justify-center lg:gap-16">
                        <motion.section
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="flex flex-col items-center gap-8 rounded-[2.5rem] border border-white/60 bg-white/50 p-10 shadow-[0_24px_70px_-20px_rgba(224,112,158,0.4)] backdrop-blur-xl"
                        >
                          <LinkedTaskBadge title={linkedTaskTitle} />
                          <SessionProgress
                              remainingSeconds={remainingSeconds}
                              plannedSeconds={session.plannedDurationSeconds}
                              status={session.status}
                          />
                          <TimerControls
                              status={session.status}
                              pending={actionPending}
                              onPause={pause}
                              onResume={resume}
                              onStopRequested={() => setConfirmingStop(true)}
                          />
                        </motion.section>

                        <motion.aside
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.12, ease: 'easeOut' }}
                            className="flex justify-center"
                        >
                          <WebcamFocusTracker
                              videoRef={videoRef}
                              cameraState={cameraState}
                              liveFocusScore={liveFocusScore}
                          />
                        </motion.aside>
                      </div>
                  ) : (
                      <motion.section
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                          className="mx-auto w-full max-w-md rounded-[2.5rem] border border-white/60 bg-white/55 p-10 text-center shadow-[0_24px_70px_-20px_rgba(224,112,158,0.45)] backdrop-blur-xl"
                      >
                        <p className="sparkle font-display text-3xl" aria-hidden="true">
                          ✦ ♡ ✦
                        </p>
                        <h2 className="mt-2 font-display text-2xl font-semibold text-ink">
                          Ready to focus?
                        </h2>
                        <p className="mt-2 font-body text-sm text-ink/60">
                          Your camera will turn on when the timer starts, to keep track of
                          focus time. Everything is processed on your device.
                        </p>
                        {isBrandNewPet && (
                            <p className="mt-2 font-body text-sm text-taro-dark">
                              This can be your very first session together — Mochi's excited
                              either way, so don't worry about doing it perfectly ♡
                            </p>
                        )}

                        <AnimatePresence mode="wait">
                          {isCountingDown ? (
                              <motion.div
                                  key="countdown"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="mt-8 flex flex-col items-center gap-2"
                                  aria-live="assertive"
                              >
                                <AnimatePresence mode="wait">
                                  <motion.span
                                      key={countdown}
                                      initial={{ opacity: 0, scale: 0.6 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 1.3 }}
                                      transition={{ duration: 0.35, ease: 'easeOut' }}
                                      className="font-display text-6xl font-bold text-taro"
                                  >
                                    {countdown}
                                  </motion.span>
                                </AnimatePresence>
                                <p className="font-body text-sm text-ink/50">Get comfy…</p>
                              </motion.div>
                          ) : (
                              <motion.div
                                  key="ready"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                              >
                                <div className="mt-8">
                                  <DurationSelector
                                      minutes={minutes}
                                      onChange={setMinutes}
                                      disabled={actionPending}
                                  />
                                </div>

                                <TaskSelector
                                    tasks={tasks}
                                    loading={tasksLoading}
                                    error={tasksError}
                                    selectedTaskId={selectedTaskId}
                                    onChange={setSelectedTaskId}
                                    disabled={actionPending}
                                />

                                <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                    disabled={actionPending || minutes < focusConfig.MIN_DURATION_MINUTES}
                                    onClick={beginCountdown}
                                    className="mt-8 w-full rounded-full bg-taro px-7 py-3.5 font-body text-sm font-semibold text-white shadow-lg shadow-taro/30 transition-colors hover:bg-taro-dark disabled:opacity-50"
                                >
                                  {actionPending ? 'Starting…' : 'Start studying ♡'}
                                </motion.button>
                              </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.section>
                  )}
                </div>
              </div>
          )}
        </main>

        <AnimatePresence>
          {confirmingStop && (
              <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-6 backdrop-blur-sm"
              >
                <motion.div
                    initial={{ scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.92, opacity: 0 }}
                    className="w-full max-w-sm rounded-[2rem] bg-cream p-8 text-center shadow-2xl"
                >
                  <h3 className="font-display text-lg font-semibold text-ink">
                    End this session early?
                  </h3>
                  <p className="mt-2 font-body text-sm text-ink/60">
                    Your focus data is saved, but stopping before the timer ends
                    may mark the session as partial or invalid.
                  </p>
                  <div className="mt-6 flex justify-center gap-3">
                    <button
                        type="button"
                        onClick={() => setConfirmingStop(false)}
                        className="rounded-full bg-white px-6 py-2.5 font-body text-sm font-semibold text-ink/70 shadow hover:bg-blush-light"
                    >
                      Keep going
                    </button>
                    <button
                        type="button"
                        onClick={handleStopConfirmed}
                        className="rounded-full bg-berry px-6 py-2.5 font-body text-sm font-semibold text-white shadow hover:opacity-90"
                    >
                      Stop session
                    </button>
                  </div>
                </motion.div>
              </motion.div>
          )}
        </AnimatePresence>
      </div>
  )
}

export default StudyRoomPage