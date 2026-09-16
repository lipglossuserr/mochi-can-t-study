import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/auth/AuthContext'
import { usePet } from '@/features/pet/hooks/usePet'
import { useCoStudyRoom } from '@/features/rooms/hooks/useCoStudyRoom'
import { useLiveKitRoom } from '@/features/rooms/hooks/useLiveKitRoom'
import { usePublicPets } from '@/features/rooms/hooks/usePublicPets'
import StudyBuddyMatchWidget from '@/features/study-buddy/components/StudyBuddyMatchWidget'
import VibePicker from '@/features/rooms/components/VibePicker'
import { usePawBurst } from '@/features/rooms/hooks/usePawBurst'
import { playMeow } from '@/features/rooms/utils/meow'
import { useFocusTracker } from '@/hooks/useFocusTracker'
import { characterEvents } from '@/features/character'
import { useAmbientSound } from '@/hooks/useAmbientSound'
import type { AmbientSoundKind } from '@/hooks/useAmbientSound'
import FocusStatusBadge from '@/components/study/FocusStatusBadge'
import {
  createRoom,
  endRoom,
  getRoomOnce,
  postSystemMessage,
  reportDeskAwayViolation,
  reportLiveFocusPercent,
  setAmbientSound,
  setVoidedReason,
  subscribeToPublicRooms,
} from '@/features/rooms/api/roomRepository'
import {
  fetchRoomSessionSummary,
  fetchRoomAnalytics,
  fetchModerationLog,
  voidRoomSessions,
} from '@/features/rooms/api/roomSessionService'
import { fetchSession } from '@/services/studySessionService'
import VideoTile from '@/features/rooms/components/VideoTile'
import SessionSummary from '@/components/study/SessionSummary'
import type { StudySession } from '@/types/studySession'
import type {
  CoStudyParticipant,
  CoStudyRoom,
  RoomAnalytics,
  RoomModerationLogEntry,
  RoomSessionSummary,
  RoomType,
  RoomVisibility,
} from '@/types/coStudyRoom'
import { formatClockTime, formatDuration } from '@/utils/timeFormat'
import Toast from '@/components/Toast'

/**
 * Study Rooms — Phase 0/1 prototype (see the roadmap doc, §5), extended
 * in Phase 2 to link each participant's time in a room to a real
 * backend StudySession (so pet XP actually fires, the same reward
 * pipeline the solo Study Room already uses) and to show real pet
 * presence tiles instead of initials. Chat/presence/the shared timer
 * itself are still Firestore-only — Phase 2 only adds a backend
 * side-channel, it doesn't change who owns the countdown.
 *
 * Phase 3 adds optional camera/mic via LiveKit (§4.1/§4.3 of the
 * roadmap: a managed SFU, not a hand-rolled WebRTC mesh). Camera
 * defaults off for everyone; useLiveKitRoom only opens a LiveKit
 * connection at all once a participant explicitly toggles it on, and a
 * camera-off participant still renders their existing pet/initials
 * tile exactly as Phase 2 already did — video is additive, never a
 * requirement to be "seen" in the room.
 *
 * Named "StudyWithOthersPage" / "CoStudyRoom" throughout, not
 * "StudyRoom", to avoid colliding with the existing solo-session
 * screen at src/pages/StudyRoomPage.tsx (route: /study-room), which
 * this does not touch.
 *
 * Phase 4 (roadmap §5, "Discovery & scheduling") adds topic tags with
 * lobby filtering, join-by-link (a room's link/code round-trips
 * through the ?room= query param), a "starts at HH:MM" label for
 * scheduled rooms, and a client-only "Host it again" quick re-create
 * for the host once a room ends — see RehostPrefill below for why
 * that's a lighter stand-in for true recurring-room scheduling.
 */

/** Study Rooms Phase 4's "Host it again" prefill — a snapshot of a just-ended room's config, not a persisted recurrence rule. See the module doc comment for why. */
interface RehostPrefill {
  topic: string
  roomType: RoomType
  visibility: RoomVisibility
  capacity: number
  durationMinutes: number
  tags: string[]
  requireAllFinish: boolean
}
/**
 * Accepts either a bare room id/code or a full pasted invite link and
 * returns just the room id. "Join with a link or code" needs to handle
 * someone pasting the whole shared URL (exactly what "Copy invite
 * link" in the in-room header produces), not only a bare id — this is
 * what makes both halves of that feature actually agree with each
 * other.
 */
function extractRoomId(rawInput: string): string {
  const trimmed = rawInput.trim()
  if (!trimmed) return ''
  try {
    const url = new URL(trimmed)
    const fromQuery = url.searchParams.get('room')
    if (fromQuery) return fromQuery.trim()
  } catch {
    // Not a parseable absolute URL — fall through and treat the whole
    // input as a bare id/code, which is the common case when someone
    // just pastes the room id itself rather than a full link.
  }
  return trimmed
}

function StudyWithOthersPage() {
  const { currentUser } = useAuth()
  const { pet } = usePet()

  const [publicRooms, setPublicRooms] = useState<CoStudyRoom[]>([])
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [joinCodeBusy, setJoinCodeBusy] = useState(false)
  const [rehostPrefill, setRehostPrefill] = useState<RehostPrefill | null>(null)
  const [analytics, setAnalytics] = useState<RoomAnalytics | null>(null)

  useEffect(() => {
    const unsub = subscribeToPublicRooms(setPublicRooms)
    return unsub
  }, [])

  const self = useMemo(
    () =>
      currentUser && pet
        ? {
            userId: currentUser.uid,
            // Was: pet.name || currentUser.displayName — every new pet
            // defaults to "Mochi", so every participant showed as the
            // same name in a room. Account displayName is the actual
            // person's chosen identity and should win here; pet.name is
            // only a last-resort fallback for accounts with no
            // displayName set at all (e.g. some email/password signups).
            displayName: currentUser.displayName || pet.name || 'A Mochi friend',
          }
        : null,
    [currentUser, pet],
  )

  // Study Rooms Phase 4: a shared invite link is just this page's own
  // URL with ?room=<id> — read it once on mount so pasting a link
  // straight into the address bar (or a shared message) drops someone
  // right into the join flow, same as the manual "Join with a link or
  // code" box below does for a pasted id.
  const autoJoinAttemptedRef = useRef(false)
  useEffect(() => {
    if (autoJoinAttemptedRef.current || !self) return
    const params = new URLSearchParams(window.location.search)
    const roomIdFromLink = params.get('room')
    if (!roomIdFromLink) return
    autoJoinAttemptedRef.current = true
    void joinByRoomId(roomIdFromLink)
  }, [self])

  // Refetch whenever the lobby is shown (activeRoomId toggles back to
  // null after a room) so a session that just finished shows up
  // without needing a full page reload — Study Rooms Phase 5.
  useEffect(() => {
    if (!self) return
    let cancelled = false
    fetchRoomAnalytics()
      .then((response) => {
        if (!cancelled) setAnalytics(response.data.data)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [self, activeRoomId])

  const joinByRoomId = async (rawInput: string) => {
    const roomId = extractRoomId(rawInput)
    if (!roomId) return
    setJoinCodeBusy(true)
    setError(null)
    try {
      const room = await getRoomOnce(roomId)
      if (!room || room.status !== 'active') {
        setError("That room link doesn't lead anywhere active — it may have ended.")
        return
      }
      setActiveRoomId(room.id)
    } catch {
      setError("Couldn't find that room — double check the link or code.")
    } finally {
      setJoinCodeBusy(false)
    }
  }

  const handleCreated = (roomId: string) => {
    setShowCreate(false)
    setRehostPrefill(null)
    setActiveRoomId(roomId)
  }

  const handleEndedWithRehost = (prefill: RehostPrefill) => {
    setActiveRoomId(null)
    setRehostPrefill(prefill)
    setShowCreate(true)
  }

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const room of publicRooms) {
      for (const tag of room.tags ?? []) set.add(tag)
    }
    return [...set].sort()
  }, [publicRooms])

  const visibleRooms = activeTag
    ? publicRooms.filter((room) => room.tags?.includes(activeTag))
    : publicRooms

  if (activeRoomId) {
    return (
      <InRoomView
        roomId={activeRoomId}
        self={self}
        onLeave={() => setActiveRoomId(null)}
        onEndedWithRehost={handleEndedWithRehost}
      />
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      {error && (
        <div className="mx-auto mb-4 w-full max-w-md">
          <Toast message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      <div className="flex flex-col items-center gap-2 text-center">
        <p className="sparkle font-display text-2xl" aria-hidden="true">
          ✦ ♡ ✦
        </p>
        <h1 className="font-display text-2xl font-semibold text-ink">Study with others</h1>
        <p className="max-w-md font-body text-sm text-ink/60">
          Sit in a shared room, keep each other company, and stay on task together — camera
          stays off unless you turn it on.
        </p>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <motion.button
          type="button"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            setRehostPrefill(null)
            setShowCreate(true)
          }}
          disabled={!self}
          className="rounded-full bg-taro px-6 py-2.5 font-body text-sm font-semibold text-white shadow-md shadow-taro/30 transition-colors hover:bg-taro-dark disabled:opacity-50"
        >
          Host a room ♡
        </motion.button>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void joinByRoomId(joinCodeInput)
          }}
          className="flex w-full max-w-xs gap-2"
        >
          <label htmlFor="join-code-input" className="sr-only">
            Join with a link or code
          </label>
          <input
            id="join-code-input"
            value={joinCodeInput}
            onChange={(event) => setJoinCodeInput(event.target.value)}
            placeholder="Paste an invite link or code"
            disabled={!self}
            className="flex-1 rounded-full border border-taro/20 bg-white/70 px-4 py-2 font-body text-xs text-ink placeholder:text-ink/40 outline-none focus:shadow-[0_0_0_3px_rgba(224,112,158,0.25)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!self || joinCodeBusy || !joinCodeInput.trim()}
            className="rounded-full bg-white/80 px-4 py-2 font-body text-xs font-semibold text-ink/70 shadow hover:bg-blush-light disabled:opacity-50"
          >
            {joinCodeBusy ? 'Joining…' : 'Join'}
          </button>
        </form>
      </div>

      {analytics && analytics.totalRoomSessions > 0 && <CoStudyStatsPanel analytics={analytics} />}

      <div className="mt-6">
        <StudyBuddyMatchWidget />
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-body text-xs font-semibold uppercase tracking-widest text-ink/50">
            Live rooms
          </h2>
        </div>

        {allTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className={`rounded-full px-3 py-1 font-body text-[11px] font-semibold transition-colors ${
                activeTag === null
                  ? 'bg-taro-dark text-white'
                  : 'bg-white/60 text-ink/60 hover:bg-blush-light'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(tag)}
                className={`rounded-full px-3 py-1 font-body text-[11px] font-semibold transition-colors ${
                  activeTag === tag
                    ? 'bg-taro-dark text-white'
                    : 'bg-white/60 text-ink/60 hover:bg-blush-light'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {visibleRooms.length === 0 ? (
          <div className="mt-4 rounded-[2rem] border border-white/50 bg-white/40 p-8 text-center backdrop-blur-xl">
            <p className="font-body text-sm text-ink/60">
              {activeTag
                ? `No live rooms tagged #${activeTag} right now.`
                : 'No rooms open right now — be the first to host one ♡'}
            </p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {visibleRooms.map((room) => {
              const startsInFuture =
                room.scheduledStartAtMs != null && room.scheduledStartAtMs > Date.now()
              return (
                <li key={room.id}>
                  <button
                    type="button"
                    onClick={() => setActiveRoomId(room.id)}
                    disabled={!self}
                    className="w-full rounded-[1.75rem] border border-white/60 bg-white/50 p-5 text-left shadow-[0_16px_40px_-18px_rgba(224,112,158,0.4)] backdrop-blur-xl transition-transform hover:scale-[1.01] disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-base font-semibold text-ink">
                        {room.topic}
                      </span>
                      <div className="flex shrink-0 gap-1.5">
                        {startsInFuture && (
                          <span className="rounded-full bg-cream px-3 py-0.5 font-body text-[11px] font-semibold text-taro-dark shadow">
                            Starts {formatClockTime(room.scheduledStartAtMs as number)}
                          </span>
                        )}
                        <span className="rounded-full bg-blush-light/70 px-3 py-0.5 font-body text-[11px] font-semibold uppercase tracking-wide text-taro-dark">
                          {room.roomType === 'focus' ? 'Focus' : 'Talk'}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 font-body text-xs text-ink/50">
                      hosted by {room.hostDisplayName} · up to {room.capacity} people
                    </p>
                    {room.tags?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {room.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-white/70 px-2 py-0.5 font-body text-[10px] text-ink/50"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <AnimatePresence>
        {showCreate && self && (
          <CreateRoomModal
            host={self}
            onClose={() => {
              setShowCreate(false)
              setRehostPrefill(null)
            }}
            onCreated={handleCreated}
            onError={setError}
            prefill={rehostPrefill ?? undefined}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Study Rooms Phase 5 (roadmap §6 "success metrics", scoped to what's
 * durably available — see RoomAnalyticsResponse's backend javadoc for
 * why camera-on ratio and chat-to-focus-minute ratio aren't here).
 * Plain divs for the trend bars rather than a charting library — this
 * is a 7-value sparkline, not a real chart.
 */
function CoStudyStatsPanel({ analytics }: { analytics: RoomAnalytics }) {
  const totalMinutes = Math.round(analytics.totalRoomStudySeconds / 60)
  const last7 = analytics.recentDailyMinutes.slice(-7)
  const maxMinutes = Math.max(1, ...last7.map((day) => day.minutes))

  return (
    <div className="mt-8 rounded-[1.75rem] border border-white/60 bg-white/45 p-5 backdrop-blur-xl">
      <h2 className="font-body text-xs font-semibold uppercase tracking-widest text-ink/50">
        Your co-study stats
      </h2>
      <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
        <Stat label="Sessions" value={String(analytics.totalRoomSessions)} />
        <Stat label="Minutes together" value={String(totalMinutes)} />
        <Stat label="Rooms joined" value={String(analytics.distinctRoomsJoined)} />
        <Stat label="Avg. session" value={`${Math.round(analytics.averageSessionMinutes)} min`} />
      </div>
      {last7.length > 1 && (
        <div className="mt-4 flex h-10 items-end gap-1.5" aria-hidden="true">
          {last7.map((day) => (
            <div
              key={day.date}
              title={`${day.date}: ${day.minutes} min`}
              className="flex-1 rounded-t-md bg-taro/50"
              style={{ height: `${Math.max(8, (day.minutes / maxMinutes) * 100)}%` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-lg font-semibold text-ink">{value}</p>
      <p className="font-body text-[11px] text-ink/50">{label}</p>
    </div>
  )
}

function CreateRoomModal({
  host,
  onClose,
  onCreated,
  onError,
  prefill,
}: {
  host: { userId: string; displayName: string }
  onClose: () => void
  onCreated: (roomId: string) => void
  onError: (message: string) => void
  /** Study Rooms Phase 4's "Host it again" — pre-fills from the room that just ended, instead of true server-side recurrence. */
  prefill?: RehostPrefill
}) {
  const [topic, setTopic] = useState(prefill?.topic ?? '')
  const [roomType, setRoomType] = useState<RoomType>(prefill?.roomType ?? 'focus')
  const [capacity, setCapacity] = useState(prefill?.capacity ?? 6)
  const [durationMinutes, setDurationMinutes] = useState(prefill?.durationMinutes ?? 25)
  const [visibility, setVisibility] = useState<RoomVisibility>(prefill?.visibility ?? 'public')
  const [tagsInput, setTagsInput] = useState(prefill?.tags.join(', ') ?? '')
  const [scheduled, setScheduled] = useState(false)
  const [scheduledLocal, setScheduledLocal] = useState('')
  const [requireAllFinish, setRequireAllFinish] = useState(prefill?.requireAllFinish ?? false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      const tags = tagsInput
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 5)
      const scheduledStartAtMs =
        scheduled && scheduledLocal ? new Date(scheduledLocal).getTime() : null
      const roomId = await createRoom(
        { topic, roomType, visibility, capacity, durationMinutes, tags, scheduledStartAtMs, requireAllFinish },
        host,
      )
      onCreated(roomId)
    } catch {
      onError("Couldn't create the room — try again in a moment.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-6 backdrop-blur-sm"
    >
      <motion.form
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-[2rem] bg-cream p-8 shadow-2xl"
      >
        <h3 className="font-display text-lg font-semibold text-ink">
          {prefill ? 'Host it again ♡' : 'Host a room'}
        </h3>

        <label className="mt-5 block font-body text-xs font-semibold uppercase tracking-wide text-ink/50">
          Topic
        </label>
        <input
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="Chem midterm review"
          required
          className="mt-1.5 w-full rounded-full border border-taro/20 bg-white/80 px-4 py-2.5 font-body text-sm text-ink placeholder:text-ink/40 outline-none focus:shadow-[0_0_0_3px_rgba(224,112,158,0.25)]"
        />

        <label className="mt-4 block font-body text-xs font-semibold uppercase tracking-wide text-ink/50">
          Tags
        </label>
        <input
          value={tagsInput}
          onChange={(event) => setTagsInput(event.target.value)}
          placeholder="chemistry, midterms (comma-separated)"
          className="mt-1.5 w-full rounded-full border border-taro/20 bg-white/80 px-4 py-2.5 font-body text-sm text-ink placeholder:text-ink/40 outline-none focus:shadow-[0_0_0_3px_rgba(224,112,158,0.25)]"
        />

        <div className="mt-4 flex gap-2">
          {(['focus', 'talk'] as RoomType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setRoomType(type)}
              className={`flex-1 rounded-full px-4 py-2 font-body text-sm font-semibold transition-colors ${
                roomType === type
                  ? 'bg-taro text-white shadow-md shadow-taro/30'
                  : 'bg-white/70 text-ink/60 hover:bg-blush-light'
              }`}
            >
              {type === 'focus' ? 'Focus (quiet)' : 'Talk (open chat)'}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          {(
            [
              ['public', 'Public — in the lobby'],
              ['link', 'Link only'],
            ] as [RoomVisibility, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setVisibility(value)}
              className={`flex-1 rounded-full px-3 py-2 font-body text-xs font-semibold transition-colors ${
                visibility === value
                  ? 'bg-taro-dark text-white shadow-md shadow-taro/30'
                  : 'bg-white/70 text-ink/60 hover:bg-blush-light'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block font-body text-xs font-semibold uppercase tracking-wide text-ink/50">
              Capacity
            </label>
            <input
              type="number"
              min={2}
              max={8}
              value={capacity}
              onChange={(event) => setCapacity(Number(event.target.value))}
              className="mt-1.5 w-full rounded-full border border-taro/20 bg-white/80 px-4 py-2 font-body text-sm text-ink outline-none focus:shadow-[0_0_0_3px_rgba(224,112,158,0.25)]"
            />
          </div>
          <div>
            <label className="block font-body text-xs font-semibold uppercase tracking-wide text-ink/50">
              Minutes
            </label>
            <input
              type="number"
              min={5}
              max={120}
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(Number(event.target.value))}
              className="mt-1.5 w-full rounded-full border border-taro/20 bg-white/80 px-4 py-2 font-body text-sm text-ink outline-none focus:shadow-[0_0_0_3px_rgba(224,112,158,0.25)]"
            />
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 font-body text-xs font-semibold text-ink/70">
          <input
            type="checkbox"
            checked={scheduled}
            onChange={(event) => setScheduled(event.target.checked)}
            className="h-4 w-4 rounded border-taro/40 text-taro focus:ring-taro"
          />
          Schedule for later (room stays joinable now, just labeled)
        </label>

        <label className="mt-3 flex items-start gap-2 rounded-2xl bg-white/60 p-3 font-body text-xs text-ink/70">
          <input
            type="checkbox"
            checked={requireAllFinish}
            onChange={(event) => setRequireAllFinish(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-taro/40 text-taro focus:ring-taro"
          />
          <span>
            <span className="block font-semibold text-ink">Everyone must finish ♡</span>
            If anyone leaves early, or is away from their desk for 10+ minutes straight, the
            session ends immediately and no one gets points. Off by default — normally,
            leaving early only affects your own reward.
          </span>
        </label>
        {scheduled && (
          <input
            type="datetime-local"
            value={scheduledLocal}
            onChange={(event) => setScheduledLocal(event.target.value)}
            className="mt-2 w-full rounded-full border border-taro/20 bg-white/80 px-4 py-2 font-body text-sm text-ink outline-none focus:shadow-[0_0_0_3px_rgba(224,112,158,0.25)]"
          />
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white px-5 py-2.5 font-body text-sm font-semibold text-ink/70 shadow hover:bg-blush-light"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-taro px-6 py-2.5 font-body text-sm font-semibold text-white shadow hover:bg-taro-dark disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create room ♡'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  )
}

function InRoomView({
  roomId,
  self,
  onLeave,
  onEndedWithRehost,
}: {
  roomId: string
  self: { userId: string; displayName: string } | null
  onLeave: () => void
  /** Study Rooms Phase 4: host-only "End room" flows back through here with a config snapshot so the lobby can offer "Host it again." */
  onEndedWithRehost: (prefill: RehostPrefill) => void
}) {
  const { celebrateStudyReward } = usePet()

  // The focus tracker's final flush must land before the linked session
  // finalizes — same discipline as StudyRoomPage. useCoStudyRoom calls
  // beforeFinalize itself right before completeSession, so this ref is
  // populated below once the tracker exists (it depends on the LiveKit
  // stream from useLiveKitRoom, which needs `self`/`roomId` from this
  // same render, so it can't be created before this hook call).
  const flushRef = useRef<() => Promise<void>>(() => Promise.resolve())

  const {
    room,
    participants,
    messages,
    remainingSeconds,
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
  } = useCoStudyRoom(roomId, self, { beforeFinalize: () => flushRef.current() })
  const [draft, setDraft] = useState('')
  const [cameraOn, setCameraOn] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [ending, setEnding] = useState(false)
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null)
  const [reportTarget, setReportTarget] = useState<{ userId: string; displayName: string } | null>(
    null,
  )
  /** Host-only moderation history panel (roadmap §3.2) — null while closed, an array (possibly empty) once fetched, and stays null while a fetch is in flight so the modal can show a loading state instead of a stale/empty list. */
  const [moderationLog, setModerationLog] = useState<RoomModerationLogEntry[] | null>(null)
  const [moderationLogOpen, setModerationLogOpen] = useState(false)
  const [moderationLogError, setModerationLogError] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [chatOpen, setChatOpen] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const { layer: pawLayer, trigger: triggerPaws } = usePawBurst()
  const lastSeenMessageCountRef = useRef(0)
  const petsByUid = usePublicPets(participants.map((p) => p.userId))
  const {
    localVideoTrack,
    remoteVideoTracks,
    connecting,
    connectionError,
    micOn,
    toggleMic,
    remoteMutedAudio,
    forceMutedSignal,
    remoteMutedVideo,
    forceCameraMutedSignal,
  } = useLiveKitRoom({
    roomId,
    self,
    cameraOn,
  })

  /**
   * The "unmissable notification" half of the mute-feedback fix: every
   * time `forceMutedSignal` bumps (see useLiveKitRoom's doc — it only
   * bumps for a host force-mute, never a self-toggle), pop a toast.
   * Keyed off the signal itself, not `micOn`, since `micOn` alone can't
   * tell a force-mute apart from the person muting themselves a moment
   * earlier — this is the fix for the actual root cause the
   * investigation found: the muted person's own client previously had
   * no idea a host had muted them at all.
   */
  const [hostMuteNotice, setHostMuteNotice] = useState<string | null>(null)
  useEffect(() => {
    if (forceMutedSignal === 0) return
    setHostMuteNotice('The host muted your mic.')
  }, [forceMutedSignal])

  /** Same idea as `hostMuteNotice` above, for the host's "turn off camera" action — see `forceCameraMutedSignal`'s doc. */
  useEffect(() => {
    if (forceCameraMutedSignal === 0) return
    setHostMuteNotice('The host turned off your camera.')
  }, [forceCameraMutedSignal])

  // Focus detection, reusing the LiveKit camera stream above rather than
  // opening a second one. Was previously entirely missing from co-study
  // rooms — only the solo StudyRoomPage had this wired up.
  const focusStream = useMemo(() => {
    if (!localVideoTrack) return null
    return new MediaStream([localVideoTrack.mediaStreamTrack])
  }, [localVideoTrack])

  const timerRunning = room?.timerStartedAtMs != null
  const {
    videoRef: focusVideoRef,
    cameraState,
    liveTotals,
    startCamera: startFocusCamera,
    stopCamera: stopFocusCamera,
    flush: flushFocus,
  } = useFocusTracker({
    sessionId: linkedSessionId,
    monitoring: timerRunning && remainingSeconds > 0,
    externalStream: focusStream,
    // Sprint: smarter focus detection. Gesture shortcuts (thumbs-up /
    // open palm) are deliberately NOT wired here, unlike StudyRoomPage:
    // this room's timer is shared across every participant with no
    // individual pause, and "end" (endRoom) affects everyone in the
    // room with no confirm dialog to gate a gesture-triggered call
    // behind — a false-positive gesture detection ending the room for
    // every participant is a real risk StudyRoomPage's solo session
    // doesn't have. The posture nudge carries no such risk (it's just
    // a friendly stretch suggestion), so it's wired below same as there.
    onPostureNudge: () => characterEvents.emit({ type: 'posture-nudge-suggested' }),
  })

  useEffect(() => {
    flushRef.current = flushFocus
  }, [flushFocus])

  // Starts the moment the camera stream is actually available — not on
  // cameraOn alone, since the LiveKit stream isn't ready yet at that
  // instant (fetchVideoToken + room.connect() are still in flight).
  useEffect(() => {
    if (focusStream) {
      void startFocusCamera()
    } else {
      void stopFocusCamera(false)
    }
  }, [focusStream, startFocusCamera, stopFocusCamera])

  useEffect(() => {
    if (chatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      lastSeenMessageCountRef.current = messages.length
      setUnreadCount(0)
    } else {
      setUnreadCount(Math.max(messages.length - lastSeenMessageCountRef.current, 0))
    }
  }, [messages.length, chatOpen])

  // Fire the same reward-diff celebration a solo session gets, exactly
  // once per finalized room session — mirrors StudyRoomPage's own
  // celebratedSessionIdRef guard.
  const celebratedSessionIdRef = useRef<number | null>(null)
  useEffect(() => {
    if (completedSessionId != null && celebratedSessionIdRef.current !== completedSessionId) {
      celebratedSessionIdRef.current = completedSessionId
      void celebrateStudyReward(completedSessionId)
    }
  }, [completedSessionId, celebrateStudyReward])

  // Personal reward summary — same box the solo StudyRoomPage shows
  // (SessionSummary), just fed this room session instead. useCoStudyRoom
  // only exposes the finalized session's id, not the full row (unlike
  // useStudySession, which already holds the whole object from its own
  // start/pause/complete calls) — one extra fetch closes that gap.
  const [myCompletedSession, setMyCompletedSession] = useState<StudySession | null>(null)
  useEffect(() => {
    if (completedSessionId == null) {
      setMyCompletedSession(null)
      return
    }
    let cancelled = false
    fetchSession(completedSessionId)
      .then((res) => {
        if (!cancelled) setMyCompletedSession(res.data.data)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [completedSessionId])

  // ---- "all must finish" policy: away-from-desk detection (self) ----
  // Reports a violation once THIS client's own focus tracker has read
  // NO_FACE continuously for 10+ minutes while the room's timer is
  // running. Only meaningful when room.requireAllFinish is true — but
  // it's fine to arm this unconditionally, since a violation flag on a
  // lenient room is simply never read by anyone.
  const AWAY_VIOLATION_MS = 10 * 60 * 1000
  const awayContinuousSinceRef = useRef<number | null>(null)
  const awayViolationReportedRef = useRef(false)
  useEffect(() => {
    if (!self) return
    if (cameraState !== 'NO_FACE' || !timerRunning || remainingSeconds <= 0) {
      awayContinuousSinceRef.current = null
      return
    }
    if (awayContinuousSinceRef.current == null) {
      awayContinuousSinceRef.current = Date.now()
    }
    const interval = window.setInterval(() => {
      if (awayViolationReportedRef.current) return
      const since = awayContinuousSinceRef.current
      if (since != null && Date.now() - since >= AWAY_VIOLATION_MS) {
        awayViolationReportedRef.current = true
        void reportDeskAwayViolation(roomId, self.userId).catch(() => undefined)
      }
    }, 5000)
    return () => window.clearInterval(interval)
  }, [cameraState, timerRunning, remainingSeconds, roomId, self])

  // ---- live in-room focus leaderboard (self broadcast) ----
  // Throttled to every 10s — frequent enough that the leaderboard feels
  // "live", infrequent enough not to hammer Firestore writes for
  // something that's cosmetic/social, not authoritative (the real
  // per-session focus numbers, used for rewards, only ever come from
  // the backend's FocusBatch data — this is a separate, lightweight,
  // display-only signal).
  useEffect(() => {
    if (!self || !timerRunning) return
    const interval = window.setInterval(() => {
      const monitored =
        liveTotals.focused + liveTotals.distracted + liveTotals.noFace + liveTotals.multipleFace
      if (monitored === 0) return
      const percent = Math.round((liveTotals.focused / monitored) * 100)
      void reportLiveFocusPercent(roomId, self.userId, percent).catch(() => undefined)
    }, 10000)
    return () => window.clearInterval(interval)
  }, [self, timerRunning, roomId, liveTotals])

  // ---- ambient co-working sound ----
  // room.ambientSound is the host's shared choice (already flows in via
  // subscribeToRoom, same as every other room field); ambientEnabled is
  // this listener's own personal on/off, independent of the room's
  // choice — same reasoning as mic mute existing alongside host
  // force-mute. Defaults on so the feature is actually discoverable
  // rather than silently doing nothing until someone finds a toggle.
  const [ambientEnabled, setAmbientEnabled] = useState(true)
  // Personal volume (0..1), persisted per-device like WeatherToggle's
  // preference — a room-mate's chosen volume has no bearing on what's
  // comfortable for someone else's speakers/headphones.
  const [ambientVolume, setAmbientVolume] = useState(() => {
    try {
      const raw = window.localStorage.getItem('mochi:ambient-volume')
      const parsed = raw === null ? 1 : Number(raw)
      return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 1
    } catch {
      return 1
    }
  })
  const handleAmbientVolumeChange = (next: number) => {
    setAmbientVolume(next)
    try {
      window.localStorage.setItem('mochi:ambient-volume', String(next))
    } catch {
      // Worst case the level doesn't persist across a reload — never worth failing loudly over.
    }
  }
  useAmbientSound((room?.ambientSound ?? null) as AmbientSoundKind | null, ambientEnabled, ambientVolume)

  // ---- "all must finish" policy: early-leave detection + violation reaction (host only) ----
  // Only the current host acts on this — every client could technically
  // observe the same Firestore state, but having every client race to
  // call voidRoomSessions would just mean N redundant (harmless, since
  // the backend call is idempotent-ish via STOPPED-session skipping)
  // network calls; restricting it to the host keeps it to one.
  const rosterAtTimerStartRef = useRef<Set<string> | null>(null)
  const [locallyDetectedViolation, setLocallyDetectedViolation] = useState<{ reason: string } | null>(null)
  const voidRequestedRef = useRef(false)

  useEffect(() => {
    if (timerRunning && rosterAtTimerStartRef.current == null) {
      rosterAtTimerStartRef.current = new Set(participants.map((p) => p.userId))
    }
    if (!timerRunning) {
      rosterAtTimerStartRef.current = null
    }
  }, [timerRunning, participants])

  // Every client detects the violation the moment it's visible in
  // already-synced Firestore state (participants list, deskAwayViolation
  // flag) and updates its own screen immediately — this doesn't wait on
  // any network round-trip, so all participants see "session voided" in
  // lockstep rather than staggered by however long the host's own calls
  // below take to land.
  //
  // Limitation this can't cover on its own: rosterAtTimerStartRef is a
  // local, in-memory snapshot, populated only while this component is
  // mounted and the timer is running. A participant who reconnects (or
  // joins fresh) AFTER a "someone left early" violation already
  // happened has no way to locally re-derive that — their own roster
  // snapshot, if it forms at all, would already reflect the
  // post-departure participant list. room?.voidedReason (below) is
  // what actually closes that gap; this effect is only "first to
  // notice", not the only source of truth.
  useEffect(() => {
    if (!room?.requireAllFinish || locallyDetectedViolation || room.voidedReason) return
    if (!timerRunning || remainingSeconds <= 0) return

    const awayViolator = participants.find((p) => p.deskAwayViolation)
    const roster = rosterAtTimerStartRef.current
    const leftEarly = roster
      ? [...roster].some((uid) => !participants.some((p) => p.userId === uid))
      : false

    if (!awayViolator && !leftEarly) return

    setLocallyDetectedViolation({
      reason: awayViolator
        ? `${awayViolator.displayName} was away from their desk for too long`
        : 'Someone left the call early',
    })
  }, [room?.requireAllFinish, room?.voidedReason, timerRunning, remainingSeconds, participants, locallyDetectedViolation])

  // The authoritative displayed state: the persisted room.voidedReason
  // once it exists (works for every client, including ones that joined
  // after the fact), falling back to this client's own just-detected
  // violation in the brief window before the host's write below lands.
  const roomVoided = room?.voidedReason
    ? { reason: room.voidedReason }
    : locallyDetectedViolation

  // Only the host performs the privileged side-effects (voiding every
  // active session server-side, persisting voidedReason on the room doc
  // so everyone — including later joiners — sees it, posting the system
  // chat message) — exactly once, guarded by voidRequestedRef so a
  // re-render from the state update right above it doesn't fire it
  // twice.
  useEffect(() => {
    if (!isHost || !locallyDetectedViolation || room?.voidedReason || voidRequestedRef.current) return
    voidRequestedRef.current = true
    const reason = locallyDetectedViolation.reason
    void (async () => {
      try {
        await voidRoomSessions(roomId)
        await setVoidedReason(roomId, reason)
        await postSystemMessage(
          roomId,
          `⚠️ Session ended early — ${reason.toLowerCase()}. No points awarded this time.`,
        )
      } catch {
        // Doesn't retry automatically — the room is still shown as
        // voided locally (locallyDetectedViolation already fired above
        // from the synced Firestore state, independent of this call's
        // outcome), so no one currently in the room is left thinking
        // they'll still get a reward even if this specific network
        // call failed. A late joiner after a failed write here is the
        // one real gap — see the module-level note on voidedReason.
      }
    })()
  }, [isHost, locallyDetectedViolation, room?.voidedReason, roomId])

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const body = draft
    if (!body.trim()) return
    setDraft('')
    triggerPaws()
    // Easter egg: typing the actual word "meow" guarantees the sound
    // (not just the usual 20% chance) — same discoverable reward as
    // Community chat's identical check.
    if (/\bmeow\b/i.test(body) || Math.random() < 0.2) playMeow()
    await sendMessage(body)
  }

  const handleCopyLink = async () => {
    const link = `${window.location.origin}${window.location.pathname}?room=${roomId}`
    try {
      await navigator.clipboard.writeText(link)
      setLinkCopied(true)
      window.setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      // Clipboard permission can be denied in some embedded browsers — the link is still selectable text if this fails, nothing further to do.
    }
  }

  const handleEndRoom = async () => {
    if (!room) return
    setEnding(true)
    try {
      await endRoom(roomId)
      onEndedWithRehost({
        topic: room.topic,
        roomType: room.roomType,
        visibility: room.visibility,
        capacity: room.capacity,
        durationMinutes: Math.round(room.timerDurationSeconds / 60),
        tags: room.tags ?? [],
        requireAllFinish: room.requireAllFinish ?? false,
      })
    } catch {
      setEnding(false)
    }
  }

  const handleRemoveParticipant = async (targetUserId: string) => {
    setOpenMenuUserId(null)
    await removeParticipant(targetUserId).catch(() => undefined)
  }

  const handleToggleMute = async (targetUserId: string) => {
    setOpenMenuUserId(null)
    // Toggles against the real current state (from useLiveKitRoom's
    // remoteMutedAudio, sourced from LiveKit itself) rather than a
    // locally-guessed one — see that hook's doc for why a host-only
    // local flag couldn't be trusted here.
    const nextMuted = !remoteMutedAudio[targetUserId]
    await muteParticipant(targetUserId, nextMuted).catch(() => undefined)
    // No optimistic local state to update afterwards: remoteMutedAudio
    // updates itself once LiveKit's TrackMuted/TrackUnmuted event comes
    // back, so the icon always reflects what actually happened, not
    // what was attempted.
  }

  const handleToggleCamera = async (targetUserId: string) => {
    setOpenMenuUserId(null)
    // Same pattern as handleToggleMute above, just against
    // remoteMutedVideo and the 'VIDEO' trackType instead.
    const nextMuted = !remoteMutedVideo[targetUserId]
    await muteParticipant(targetUserId, nextMuted, 'VIDEO').catch(() => undefined)
  }

  const handleSubmitReport = async (reason: string) => {
    if (!reportTarget) return
    await reportParticipant(reportTarget.userId, reportTarget.displayName, reason).catch(() => undefined)
    setReportTarget(null)
  }

  const handleOpenModerationLog = () => {
    if (!roomId) return
    setModerationLogOpen(true)
    setModerationLogError(null)
    setModerationLog(null)
    fetchModerationLog(roomId)
      .then((response) => setModerationLog(response.data.data))
      .catch(() => setModerationLogError("Couldn't load the moderation history."))
  }

  const timerJustEnded = timerRunning && remainingSeconds <= 0

  if (removedFromRoom) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-[2rem] border border-white/60 bg-white/60 p-8 text-center shadow-[0_24px_70px_-20px_rgba(224,112,158,0.4)] backdrop-blur-xl">
        <p className="font-display text-lg font-semibold text-ink">
          You were removed from this room
        </p>
        <p className="font-body text-sm text-ink/60">
          The host ended your time here. You're welcome to join another room whenever you're ready.
        </p>
        <button
          type="button"
          onClick={onLeave}
          className="rounded-full bg-taro px-6 py-2.5 font-body text-sm font-semibold text-white shadow hover:bg-taro-dark"
        >
          Back to lobby
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 lg:flex-row lg:items-start">
      {error && (
        <div className="mx-auto w-full max-w-md lg:hidden">
          <Toast message={error} />
        </div>
      )}
      {sessionLinkError && (
        <div className="mx-auto w-full max-w-md lg:hidden">
          <Toast message={sessionLinkError} />
        </div>
      )}
      {connectionError && (
        <div className="mx-auto w-full max-w-md lg:hidden">
          <Toast message={connectionError} />
        </div>
      )}
      {hostMuteNotice && (
        // Deliberately not lg:hidden like the toasts above — this is
        // the "unmissable" half of the mute-feedback fix, so it shows
        // on every viewport, not just mobile.
        <div className="mx-auto w-full max-w-md">
          <Toast message={hostMuteNotice} tone="info" onDismiss={() => setHostMuteNotice(null)} />
        </div>
      )}

      <section className="flex-1 rounded-[2.5rem] border border-white/60 bg-white/50 p-8 shadow-[0_24px_70px_-20px_rgba(224,112,158,0.4)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-display text-xl font-semibold text-ink">
              {room?.topic ?? 'Loading room…'}
            </h1>
            <p className="font-body text-xs text-ink/50">
              {room?.roomType === 'talk' ? 'Talk room' : 'Focus room'} · hosted by{' '}
              {room?.hostDisplayName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isHost && (
              <button
                type="button"
                onClick={handleOpenModerationLog}
                className="rounded-full bg-white/80 px-4 py-2 font-body text-xs font-semibold text-ink/70 shadow hover:bg-blush-light"
              >
                Moderation history
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="rounded-full bg-white/80 px-4 py-2 font-body text-xs font-semibold text-ink/70 shadow hover:bg-blush-light"
            >
              {linkCopied ? 'Link copied ♡' : 'Copy invite link'}
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <p
            className="font-display text-5xl font-semibold tabular-nums text-ink"
            role="timer"
            aria-live="polite"
          >
            {formatDuration(remainingSeconds)}
          </p>
          {!timerRunning && (
            <p className="font-body text-xs text-ink/50">
              {isHost ? 'Start the shared timer when everyone is ready.' : 'Waiting for the host to start…'}
            </p>
          )}
          {isHost && !timerRunning && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => void startTimer()}
              className="rounded-full bg-taro px-6 py-2.5 font-body text-sm font-semibold text-white shadow-md shadow-taro/30 hover:bg-taro-dark"
            >
              Start timer ♡
            </motion.button>
          )}
        </div>

        {timerJustEnded && roomVoided && (
          <div className="mt-6 mx-auto max-w-md rounded-[2rem] border border-berry/30 bg-blush-light/60 p-6 text-center">
            <span className="inline-block rounded-full bg-berry px-4 py-1.5 font-display text-xs font-semibold uppercase tracking-widest text-white">
              Session voided
            </span>
            <h3 className="mt-3 font-display text-xl font-semibold text-ink">No points this time</h3>
            <p className="mt-1 font-body text-sm text-ink/70">
              This room required everyone to finish. {roomVoided.reason} — the room's policy means
              no one earns a reward for this session. You're welcome to start a new one anytime.
            </p>
          </div>
        )}

        {timerJustEnded && !roomVoided && myCompletedSession && (
          <div className="mt-6">
            <p className="mb-3 text-center font-body text-xs font-semibold uppercase tracking-widest text-taro-dark">
              {room?.topic} · co-studied with {Math.max(participants.length - 1, 0)}{' '}
              {participants.length - 1 === 1 ? 'other' : 'others'} · room bonus applied ♡
            </p>
            <SessionSummary session={myCompletedSession} onDismiss={() => setMyCompletedSession(null)} />
          </div>
        )}

        {timerJustEnded && !roomVoided && <RoomRecap roomId={roomId} />}

        {/* Video-call grid — square-ish real tiles (aspect-video, fills
        its cell) via VideoTile, auto-fitting columns like a normal call
        UI rather than the old flex-wrap of tiny circular avatars. */}
        <div className="mt-8">
          <h2 className="font-body text-xs font-semibold uppercase tracking-widest text-ink/50">
            In the room ({participants.length})
          </h2>
          {(() => {
            // Live focus leaderboard — top 3 only, medals not ranks.
            // Deliberately doesn't show a rank/number for everyone —
            // that reads as public shaming for whoever's last; a medal
            // on the top performers is the gamified-not-shaming version
            // the room asked for. Needs at least 2 participants
            // reporting a live percent to be worth showing at all (a
            // "leaderboard" of one person alone conveys nothing).
            const ranked = participants
              .filter((p) => typeof p.liveFocusPercent === 'number')
              .sort((a, b) => (b.liveFocusPercent ?? 0) - (a.liveFocusPercent ?? 0))
            const medalByUserId = new Map<string, string>()
            if (ranked.length >= 2) {
              const medals = ['🥇', '🥈', '🥉']
              ranked.slice(0, 3).forEach((p, i) => medalByUserId.set(p.userId, medals[i]))
            }

            return (
          <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
            {participants.map((participant) => {
              const pet = petsByUid[participant.userId]
              const isSelf = participant.userId === self?.userId
              const videoTrack = isSelf ? localVideoTrack : remoteVideoTracks[participant.userId]
              // Truthful now for everyone, not just the host — see
              // useLiveKitRoom's doc. Deliberately uniform "Mic off"
              // rather than guessing "muted by host" for a remote
              // participant: an observer genuinely can't tell a
              // self-mute from a host force-mute apart from LiveKit's
              // track state alone. The muted person themselves gets
              // that distinction explicitly via the hostMuteNotice
              // toast below instead.
              const isMuted = isSelf ? !micOn : !!remoteMutedAudio[participant.userId]
              // Camera-off has no self-toggle path in this room (see
              // useLiveKitRoom's doc) — a remote participant's video
              // tile just won't render/publish when they're not
              // sharing camera at all, so this only ever reflects a
              // host's "turn off camera" action on someone else.
              const isCameraOff = !isSelf && !!remoteMutedVideo[participant.userId]
              const medal = medalByUserId.get(participant.userId)

              const nameOverlay = (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-ink/70 to-transparent px-2.5 py-2">
                  <span className="flex items-center gap-1 font-body text-[11px] font-semibold text-white">
                    {participant.displayName}
                    {participant.userId === room?.hostUserId && (
                      <span className="text-taro-light">· host</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    {isMuted && (
                      <span title="Mic off">
                        🔇
                      </span>
                    )}
                    {isCameraOff && (
                      <span title="Camera off">
                        📷🚫
                      </span>
                    )}
                    {isSelf && <FocusStatusBadge state={cameraState} />}
                  </span>
                </div>
              )

              const actionsMenu = !isSelf && (
                <div className="pointer-events-auto absolute right-1 top-1">
                  <ParticipantActionsMenu
                    participant={participant}
                    isHost={isHost}
                    isMuted={!!remoteMutedAudio[participant.userId]}
                    isCameraOff={!!remoteMutedVideo[participant.userId]}
                    open={openMenuUserId === participant.userId}
                    onToggle={() =>
                      setOpenMenuUserId((current) =>
                        current === participant.userId ? null : participant.userId,
                      )
                    }
                    onRemove={() => void handleRemoveParticipant(participant.userId)}
                    onMute={() => void handleToggleMute(participant.userId)}
                    onToggleCamera={() => void handleToggleCamera(participant.userId)}
                    onReport={() =>
                      setReportTarget({
                        userId: participant.userId,
                        displayName: participant.displayName,
                      })
                    }
                  />
                </div>
              )

              // Live focus leaderboard medal — top-left, since the name
              // overlay already owns the bottom edge and the actions
              // menu already owns the top-right corner.
              const medalBadge = medal && (
                <span
                  className="pointer-events-none absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-sm shadow"
                  title={`#${ranked.findIndex((p) => p.userId === participant.userId) + 1} focus in this room right now`}
                >
                  {medal}
                </span>
              )

              // A participant's own cameraEnabled flag (Firestore presence) can
              // lag a beat behind the LiveKit track actually subscribing/
              // unsubscribing — gate on having a real track, not just the flag,
              // so a tile never flashes an empty video box.
              if (videoTrack) {
                return (
                  <div key={participant.userId} title={participant.displayName}>
                    <VideoTile track={videoTrack} displayName={participant.displayName} mirrored={isSelf}>
                      {nameOverlay}
                      {actionsMenu}
                      {medalBadge}
                    </VideoTile>
                  </div>
                )
              }

              // Camera-off placeholder tile — same footprint as a real
              // video tile so the grid doesn't jump around as people
              // toggle their cameras on/off.
              return (
                <div
                  key={participant.userId}
                  className="relative aspect-video w-full overflow-hidden rounded-2xl bg-ink/10 shadow"
                  title={pet ? `${pet.name} · Lv. ${pet.level}` : participant.displayName}
                >
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-taro font-display text-lg font-semibold text-white">
                      {pet ? '🐾' : participant.displayName.charAt(0).toUpperCase()}
                      {pet && (
                        <span className="absolute -bottom-1 -right-1 rounded-full bg-cream px-1 font-body text-[9px] font-bold text-taro-dark shadow">
                          {pet.level}
                        </span>
                      )}
                    </span>
                  </div>
                  {nameOverlay}
                  {actionsMenu}
                  {medalBadge}
                </div>
              )
            })}
          </div>
            )
          })()}
        </div>

        {/* Call controls — below the video grid, meet/zoom-style. */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setCameraOn((on) => !on)}
            disabled={connecting}
            aria-pressed={cameraOn}
            className={`rounded-full px-4 py-2 font-body text-xs font-semibold shadow transition-colors disabled:opacity-50 ${
              cameraOn
                ? 'bg-taro text-white hover:bg-taro-dark'
                : 'bg-white/80 text-ink/70 hover:bg-blush-light'
            }`}
          >
            {connecting ? 'Connecting…' : cameraOn ? 'Camera on ♡' : 'Camera off'}
          </button>
          {cameraOn && (
            <button
              type="button"
              onClick={() => void toggleMic()}
              disabled={connecting}
              aria-pressed={micOn}
              className={`rounded-full px-4 py-2 font-body text-xs font-semibold shadow transition-colors disabled:opacity-50 ${
                micOn
                  ? 'bg-taro text-white hover:bg-taro-dark'
                  : 'bg-white/80 text-ink/70 hover:bg-blush-light'
              }`}
            >
              {micOn ? 'Mic on ♡' : 'Mic off'}
            </button>
          )}
          {isHost ? (
            <button
              type="button"
              onClick={() => void handleEndRoom()}
              disabled={ending}
              className="rounded-full bg-berry px-4 py-2 font-body text-xs font-semibold text-white shadow hover:opacity-90 disabled:opacity-50"
            >
              {ending ? 'Ending…' : 'End room for everyone'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onLeave}
              className="rounded-full bg-berry px-4 py-2 font-body text-xs font-semibold text-white shadow hover:opacity-90"
            >
              Leave call
            </button>
          )}
          {isHost && (
            <button
              type="button"
              onClick={onLeave}
              className="rounded-full bg-white/80 px-4 py-2 font-body text-xs font-semibold text-ink/70 shadow hover:bg-blush-light"
            >
              Leave (keep room running)
            </button>
          )}

          <span className="mx-1 h-6 w-px bg-ink/10" aria-hidden="true" />

          <VibePicker
            activeSound={(room?.ambientSound ?? null) as AmbientSoundKind | null}
            isHost={isHost}
            enabled={ambientEnabled}
            volume={ambientVolume}
            onToggleEnabled={() => setAmbientEnabled((on) => !on)}
            onVolumeChange={handleAmbientVolumeChange}
            onSelectSound={(sound) => void setAmbientSound(roomId, sound).catch(() => undefined)}
          />
        </div>
      </section>

      {/* Hidden video element the focus tracker samples from — attached
      to the LiveKit self stream, never rendered visibly (the actual
      visible self-preview is the real VideoTile above). */}
      <video ref={focusVideoRef} className="hidden" muted playsInline />


      {chatOpen ? (
        <aside className="cat-cursor flex w-full flex-col rounded-[2.5rem] border border-white/60 bg-white/45 p-6 shadow-[0_24px_70px_-20px_rgba(224,112,158,0.4)] backdrop-blur-xl lg:w-80">
          <div className="flex items-center justify-between">
            <h2 className="font-body text-xs font-semibold uppercase tracking-widest text-ink/50">
              Chat
            </h2>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              aria-label="Collapse chat"
              title="Collapse chat"
              className="flex h-6 w-6 items-center justify-center rounded-full text-ink/40 hover:bg-blush-light hover:text-ink/70"
            >
              ›
            </button>
          </div>
          <div className="mt-3 flex h-72 flex-col gap-2 overflow-y-auto pr-1">
            {messages.map((message) => {
              if (message.kind === 'system') {
                return (
                  <div key={message.id} className="text-center">
                    <p className="font-body text-[11px] italic text-ink/40">{message.body}</p>
                  </div>
                )
              }
              // Self on the left, everyone else on the right, per the room's requested layout.
              const isSelf = message.userId === self?.userId
              return (
                <div key={message.id} className={`flex ${isSelf ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-1.5 font-body text-sm ${
                      isSelf ? 'bg-taro/15 text-ink' : 'bg-white/80 text-ink/80'
                    }`}
                  >
                    {!isSelf && (
                      <span className="block font-semibold text-taro-dark">{message.displayName}</span>
                    )}
                    {message.body}
                  </div>
                </div>
              )
            })}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSend} className="mt-3 flex gap-2">
            <label htmlFor="room-chat-input" className="sr-only">
              Send a message
            </label>
            <input
              id="room-chat-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Say hi ♡"
              className="flex-1 rounded-full border border-taro/20 bg-white/80 px-4 py-2 font-body text-sm text-ink placeholder:text-ink/40 outline-none focus:shadow-[0_0_0_3px_rgba(224,112,158,0.25)]"
            />
            <button
              type="submit"
              className="cat-ears relative rounded-full bg-taro px-4 py-2 font-body text-sm font-semibold text-white shadow hover:bg-taro-dark"
            >
              {pawLayer}
              Send
            </button>
          </form>
        </aside>
      ) : (
        // Collapsed state — a slim reopen tab, Zoom-style, so the video
        // grid above gets the freed-up width instead (it's flex-1 in the
        // parent row, so this shrinking is all it takes).
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          aria-label={unreadCount > 0 ? `Open chat, ${unreadCount} new message${unreadCount === 1 ? '' : 's'}` : 'Open chat'}
          title="Open chat"
          className="relative flex h-12 w-12 shrink-0 items-center justify-center self-start rounded-full border border-white/60 bg-white/70 text-ink/60 shadow-lg backdrop-blur-xl hover:bg-blush-light hover:text-ink lg:flex-col lg:gap-2 lg:rounded-[2rem] lg:py-6"
        >
          <span className="text-lg">💬</span>
          <span className="hidden font-body text-[10px] font-semibold uppercase tracking-widest lg:[writing-mode:vertical-rl]">
            Chat
          </span>
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-berry px-1 font-body text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      <AnimatePresence>
        {reportTarget && (
          <ReportModal
            targetDisplayName={reportTarget.displayName}
            onCancel={() => setReportTarget(null)}
            onSubmit={handleSubmitReport}
          />
        )}
        {moderationLogOpen && (
          <ModerationLogModal
            entries={moderationLog}
            error={moderationLogError}
            displayNameFor={(uid) => participants.find((p) => p.userId === uid)?.displayName ?? uid}
            onClose={() => setModerationLogOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Study Rooms moderation surface (roadmap §3.2). Host-only actions are
 * still gated server-side (RoomModerationController checks the caller
 * is really the host) — `isHost` here only controls which buttons
 * render, it's not the security boundary itself.
 */
function ParticipantActionsMenu({
  participant,
  isHost,
  isMuted,
  isCameraOff,
  open,
  onToggle,
  onRemove,
  onMute,
  onToggleCamera,
  onReport,
}: {
  participant: CoStudyParticipant
  isHost: boolean
  isMuted: boolean
  isCameraOff: boolean
  open: boolean
  onToggle: () => void
  onRemove: () => void
  onMute: () => void
  onToggleCamera: () => void
  onReport: () => void
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-label={`More options for ${participant.displayName}`}
        aria-expanded={open}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-ink/40 text-white hover:bg-ink/60"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-10 w-40 overflow-hidden rounded-2xl border border-white/60 bg-cream shadow-xl">
          {isHost && (
            <>
              <button
                type="button"
                onClick={onMute}
                className="block w-full px-4 py-2 text-left font-body text-xs text-ink/70 hover:bg-blush-light"
              >
                {isMuted ? 'Unmute' : 'Mute'}
              </button>
              <button
                type="button"
                onClick={onToggleCamera}
                className="block w-full px-4 py-2 text-left font-body text-xs text-ink/70 hover:bg-blush-light"
              >
                {isCameraOff ? 'Allow camera' : 'Turn off camera'}
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="block w-full px-4 py-2 text-left font-body text-xs text-ink/70 hover:bg-blush-light"
              >
                Remove from room
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onReport}
            className="block w-full px-4 py-2 text-left font-body text-xs text-red-500/80 hover:bg-blush-light"
          >
            Report
          </button>
        </div>
      )}
    </div>
  )
}

function ReportModal({
  targetDisplayName,
  onCancel,
  onSubmit,
}: {
  targetDisplayName: string
  onCancel: () => void
  onSubmit: (reason: string) => Promise<void>
}) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    await onSubmit(reason)
    setSubmitting(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-6 backdrop-blur-sm"
    >
      <motion.form
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-[2rem] bg-cream p-8 shadow-2xl"
      >
        <h3 className="font-display text-lg font-semibold text-ink">Report {targetDisplayName}</h3>
        <p className="mt-1 font-body text-xs text-ink/50">
          This goes to Mochi's team for review — {targetDisplayName} won't be notified.
        </p>
        <label className="mt-4 block font-body text-xs font-semibold uppercase tracking-wide text-ink/50">
          What happened?
        </label>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          required
          rows={4}
          maxLength={500}
          placeholder="Describe what happened…"
          className="mt-1.5 w-full rounded-2xl border border-taro/20 bg-white/80 px-4 py-2.5 font-body text-sm text-ink placeholder:text-ink/40 outline-none focus:shadow-[0_0_0_3px_rgba(224,112,158,0.25)]"
        />
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-white px-5 py-2.5 font-body text-sm font-semibold text-ink/70 shadow hover:bg-blush-light"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !reason.trim()}
            className="rounded-full bg-taro px-6 py-2.5 font-body text-sm font-semibold text-white shadow hover:bg-taro-dark disabled:opacity-50"
          >
            {submitting ? 'Sending…' : 'Submit report'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  )
}

/**
 * Host-only moderation history panel (roadmap §3.2) — reads
 * `GET /video/rooms/{roomId}/moderation-log`, fetched by the caller
 * once when the panel opens (see `handleOpenModerationLog`); this
 * component only renders whatever it's handed. `entries` is `null`
 * while the fetch is in flight, matching `RoomRecap`'s loading
 * convention below. `displayNameFor` falls back to the raw uid for a
 * target/actor who's since left the room — the log outlives a
 * participant's presence, so there's no participants-array entry to
 * resolve against once they're gone.
 */
function ModerationLogModal({
  entries,
  error,
  displayNameFor,
  onClose,
}: {
  entries: RoomModerationLogEntry[] | null
  error: string | null
  displayNameFor: (uid: string) => string
  onClose: () => void
}) {
  const describeEntry = (entry: RoomModerationLogEntry) => {
    const actor = displayNameFor(entry.actorUid)
    const target = displayNameFor(entry.targetUid)
    switch (entry.action) {
      case 'MUTE':
        return `${actor} muted ${target}'s ${entry.trackType === 'VIDEO' ? 'camera' : 'mic'}`
      case 'UNMUTE':
        return `${actor} unmuted ${target}'s ${entry.trackType === 'VIDEO' ? 'camera' : 'mic'}`
      case 'REMOVE':
        return `${actor} removed ${target} from the room`
      case 'REPORT':
        return `${actor} reported ${target}${entry.reason ? ` — "${entry.reason}"` : ''}`
      default:
        return `${actor} → ${target}: ${entry.action}`
    }
  }

  return (
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
        className="flex max-h-[70vh] w-full max-w-md flex-col rounded-[2rem] bg-cream p-8 shadow-2xl"
      >
        <h3 className="font-display text-lg font-semibold text-ink">Moderation history</h3>
        <p className="mt-1 font-body text-xs text-ink/50">
          Every mute, camera, remove, and report action in this room, most recent first.
        </p>
        <div className="mt-4 flex-1 overflow-y-auto">
          {error && <p className="font-body text-sm text-red-500/80">{error}</p>}
          {!error && entries === null && (
            <p className="font-body text-sm text-ink/50">Loading…</p>
          )}
          {!error && entries !== null && entries.length === 0 && (
            <p className="font-body text-sm text-ink/50">Nothing logged in this room yet.</p>
          )}
          {!error && entries !== null && entries.length > 0 && (
            <ul className="flex flex-col gap-2.5">
              {entries.map((entry) => (
                <li key={entry.id} className="rounded-2xl bg-white/70 px-4 py-2.5">
                  <p className="font-body text-sm text-ink">{describeEntry(entry)}</p>
                  <p className="font-body text-[11px] text-ink/40">
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white px-5 py-2.5 font-body text-sm font-semibold text-ink/70 shadow hover:bg-blush-light"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/**
 * Aggregated recap once the shared timer hits zero — pulled from the
 * real backend (MySQL), not Firestore, since it's summarizing linked
 * StudySession rows across every participant. Fetched once per mount
 * with a short delay so slower participants' own complete() calls have
 * a moment to land before the rollup is read.
 */
function RoomRecap({ roomId }: { roomId: string }) {
  const [summary, setSummary] = useState<RoomSessionSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      fetchRoomSessionSummary(roomId)
        .then((response) => {
          if (!cancelled) setSummary(response.data.data)
        })
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 2000)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [roomId])

  if (loading) {
    return (
      <p className="mt-4 text-center font-body text-xs text-ink/40">Tallying up the session…</p>
    )
  }

  if (!summary || summary.participantCount === 0) return null

  const totalMinutes = Math.round(summary.totalAccumulatedStudySeconds / 60)

  return (
    <div className="mt-4 rounded-[1.5rem] border border-white/60 bg-blush-light/40 p-4 text-center">
      <p className="font-body text-xs font-semibold uppercase tracking-widest text-taro-dark">
        Session recap
      </p>
      <p className="mt-1 font-body text-sm text-ink/70">
        {summary.participantCount} {summary.participantCount === 1 ? 'person' : 'people'} studied{' '}
        {totalMinutes} {totalMinutes === 1 ? 'minute' : 'minutes'} together
        {summary.averageFocusScore != null && (
          <> · avg. focus {Math.round(summary.averageFocusScore)}%</>
        )}
      </p>
    </div>
  )
}

export default StudyWithOthersPage
