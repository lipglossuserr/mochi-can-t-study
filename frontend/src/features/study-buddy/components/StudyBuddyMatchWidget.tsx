import { useEffect, useRef, useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { usePet } from '@/features/pet/hooks/usePet'
import { useTasks } from '@/features/tasks'
import { createRoom } from '@/features/rooms/api/roomRepository'
import { usePublicPets } from '@/features/rooms/hooks/usePublicPets'
import { usePawBurst } from '@/features/rooms/hooks/usePawBurst'
import { useStudyBuddyQueue } from '../hooks/useStudyBuddyQueue'

/** Cycled while WAITING so the wait doesn't just sit on one static line — purely cosmetic, doesn't reflect real matching progress (the actual match check happens every poll regardless of which line is showing). */
const WAITING_MESSAGES = [
  'Looking for someone studying the same thing…',
  'Checking who else just sat down to study…',
  "Matching by what you're working on…",
  'Almost there — good things take a moment ♡',
]

/**
 * StudyBuddyMatchWidget
 *
 * The self-contained "find someone to study with" flow: type a
 * subject, wait to be paired by keyword overlap
 * (StudyBuddyMatchingService on the backend), then land in a shared
 * Co-Study Room together. Meant to be dropped into StudyWithOthersPage's
 * lobby, alongside the existing "browse public rooms" / "create a room"
 * paths — this is a third, more automatic way in, not a replacement
 * for either.
 * <p>
 * Room creation happens client-side here (not on the backend) for the
 * same reason every other Co-Study Room is created client-side — see
 * CoStudyRoomRepository's doc comment on the backend for why Study
 * Rooms' realtime state is Firestore-owned. Whichever matched user's
 * widget runs first "wins" the race to create the room and reports its
 * id back (`reportRoom`); the other side's next poll picks that id up
 * instead of creating a second one.
 */
function StudyBuddyMatchWidget() {
  const { currentUser } = useAuth()
  const { pet } = usePet()
  const { tasks } = useTasks('PENDING')
  const navigate = useNavigate()
  const { queueStatus, pending, error, join, leave, reportRoom } = useStudyBuddyQueue()
  const { layer: pawLayer, trigger: triggerPaws } = usePawBurst()

  const [subject, setSubject] = useState('')
  const prefillApplied = useRef(false)
  useEffect(() => {
    // Prefill once, from whatever the most recent pending task happens
    // to be at the moment this widget first mounts — a convenience
    // default, not a live-synced field, so it doesn't fight the user's
    // own typing if their task list changes while they're deciding.
    if (!prefillApplied.current && tasks.length > 0) {
      prefillApplied.current = true
      setSubject((current) => current || tasks[0].title)
    }
  }, [tasks])

  const matchedUid = queueStatus?.status === 'MATCHED' ? queueStatus.matchedWithUserUid : null
  const petsByUid = usePublicPets(matchedUid ? [matchedUid] : [])
  const matchedPet = matchedUid ? petsByUid[matchedUid] : null

  // Cycles the waiting-state copy every few seconds — cosmetic only,
  // see WAITING_MESSAGES' own comment.
  const [waitingMessageIndex, setWaitingMessageIndex] = useState(0)
  useEffect(() => {
    if (queueStatus?.status !== 'WAITING') {
      setWaitingMessageIndex(0)
      return
    }
    const interval = setInterval(() => {
      setWaitingMessageIndex((i) => (i + 1) % WAITING_MESSAGES.length)
    }, 3200)
    return () => clearInterval(interval)
  }, [queueStatus?.status])

  // A little celebratory paw burst the instant a match lands — fires
  // once per match (guarded so the burst doesn't replay on every
  // re-render while MATCHED, e.g. once roomId arrives and this
  // component re-renders again before navigating away).
  const celebratedRef = useRef(false)
  useEffect(() => {
    if (queueStatus?.status === 'MATCHED' && !celebratedRef.current) {
      celebratedRef.current = true
      ;[0, 120, 240, 360].forEach((delay) => setTimeout(triggerPaws, delay))
    }
    if (queueStatus?.status !== 'MATCHED') {
      celebratedRef.current = false
    }
  }, [queueStatus?.status, triggerPaws])

  // Once matched with no room yet, race to create one — guarded so a
  // re-render (or React StrictMode's dev-only double-invoke) can't fire
  // this twice and create two rooms for the same match.
  const roomCreationStartedRef = useRef(false)
  useEffect(() => {
    if (queueStatus?.status !== 'MATCHED' || queueStatus.roomId || !currentUser) return
    if (roomCreationStartedRef.current) return
    roomCreationStartedRef.current = true

    void createRoom(
      {
        topic: queueStatus.subject || 'Study buddies',
        roomType: 'focus',
        visibility: 'link',
        capacity: 2,
        durationMinutes: 25,
        tags: ['study-buddy'],
      },
      {
        userId: currentUser.uid,
        displayName: currentUser.displayName || pet?.name || 'A Mochi friend',
      },
    )
      .then((roomId) => reportRoom(roomId))
      .catch(() => {
        // The OTHER matched user's widget is very likely about to
        // succeed at this same race — leaving roomCreationStartedRef
        // true here deliberately prevents a retry loop; the next poll
        // picking up their reported roomId is the actual recovery path.
      })
  }, [queueStatus, currentUser, pet, reportRoom])

  // Auto-navigate the instant a room id is available — whether this
  // side created it or the match partner did.
  useEffect(() => {
    if (queueStatus?.status === 'MATCHED' && queueStatus.roomId) {
      navigate(`/study-with-others?room=${queueStatus.roomId}`)
    }
  }, [queueStatus, navigate])

  const handleJoin = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = subject.trim()
    if (!trimmed) return
    void join(trimmed)
  }

  return (
    <motion.div
      layout
      className="rounded-[2rem] border border-white/60 bg-white/50 p-5 shadow-[0_18px_50px_-20px_rgba(224,112,158,0.35)] backdrop-blur-xl"
    >
      <h3 className="flex items-center gap-1.5 font-display text-base font-semibold text-ink">
        <motion.span
          aria-hidden="true"
          animate={{ rotate: [0, -8, 8, -8, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 2.5 }}
          className="inline-block"
        >
          🤝
        </motion.span>
        Find a study buddy
      </h3>
      <p className="mt-1 font-body text-xs text-ink/55">
        Tell us what you're working on — we'll pair you with someone studying something similar.
      </p>

      <AnimatePresence mode="wait">
        {!queueStatus || queueStatus.status === 'CANCELLED' || queueStatus.status === 'EXPIRED' ? (
          <motion.form
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleJoin}
            className="mt-3 flex gap-2"
          >
            <input
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="e.g. Organic chemistry"
              maxLength={200}
              className="min-w-0 flex-1 rounded-full border border-blush-light/70 bg-white px-4 py-2 font-body text-sm text-ink outline-none transition-shadow focus:border-taro focus:shadow-[0_0_0_3px_rgba(224,112,158,0.15)]"
            />
            <button
              type="submit"
              disabled={pending || !subject.trim()}
              className="shine-sweep shrink-0 rounded-full bg-taro px-4 py-2 font-body text-sm font-semibold text-white shadow transition-colors hover:bg-taro-dark disabled:opacity-50"
            >
              {pending ? 'Joining…' : 'Find'}
            </button>
          </motion.form>
        ) : queueStatus.status === 'WAITING' ? (
          <motion.div
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-3 flex items-center justify-between gap-3 rounded-full bg-butter/60 px-4 py-2.5"
          >
            <span className="flex items-center gap-2.5 font-body text-sm text-ink/70">
              {/* radar-style pulse — two expanding rings behind the search
                  emoji, staggered so a new ring starts before the last
                  one fully fades, reading as continuous "searching"
                  motion rather than one-shot */}
              <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
                {[0, 0.9].map((delay) => (
                  <motion.span
                    key={delay}
                    className="absolute inset-0 rounded-full bg-taro/30"
                    initial={{ scale: 0.4, opacity: 0.7 }}
                    animate={{ scale: 1.8, opacity: 0 }}
                    transition={{ duration: 1.8, repeat: Infinity, delay, ease: 'easeOut' }}
                  />
                ))}
                <span aria-hidden="true" className="relative">🔍</span>
              </span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={waitingMessageIndex}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25 }}
                >
                  {WAITING_MESSAGES[waitingMessageIndex]}
                  <span className="text-ink/50"> "{queueStatus.subject}"</span>
                </motion.span>
              </AnimatePresence>
            </span>
            <button
              type="button"
              onClick={() => void leave()}
              className="shrink-0 font-body text-xs font-semibold text-ink/50 hover:text-ink/80"
            >
              Cancel
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="matched"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className="relative mt-3 overflow-hidden rounded-2xl bg-matcha-light/60 px-4 py-4 text-center"
          >
            {pawLayer}
            <motion.span
              aria-hidden="true"
              className="block text-3xl"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ duration: 0.5, times: [0, 0.6, 1] }}
            >
              🎉
            </motion.span>
            <p className="mt-1 font-body text-sm font-semibold text-ink">
              Matched with {matchedPet?.name ?? 'a study buddy'}!
            </p>
            <p className="mt-0.5 flex items-center justify-center gap-1.5 font-body text-xs text-ink/60">
              <motion.span
                aria-hidden="true"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="inline-block"
              >
                ⏳
              </motion.span>
              Setting up your room…
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="mt-2 font-body text-xs text-berry">{error}</p>}
    </motion.div>
  )
}

export default StudyBuddyMatchWidget
