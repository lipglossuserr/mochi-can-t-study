import { motion } from 'framer-motion'
import type { StudySession } from '@/types/studySession'
import { formatDuration } from '@/utils/timeFormat'
import RewardCelebration from '@/features/pet/components/RewardCelebration'
import FocusTimelineChart from '@/components/study/FocusTimelineChart'
import ShareRecapButton from '@/features/study-recap/ShareRecapButton'
import { usePet } from '@/features/pet/hooks/usePet'

/**
 * The final result screen. Every number here is the server's calculation
 * — the client displays and never computes final metrics.
 */
const CLASSIFICATION_STYLE = {
  VALID: {
    badge: 'bg-matcha-light text-ink',
    title: 'Beautiful session!',
    note: 'Completed with strong focus — your mochi is proud ♡',
  },
  PARTIAL: {
    badge: 'bg-butter text-ink',
    title: 'A good effort',
    note: 'Part of the way there. Every focused minute still counts.',
  },
  INVALID: {
    badge: 'bg-blush-light text-berry',
    title: 'Session too short',
    note: 'This one was cut early or focus data was unusable. Fresh start next time!',
  },
} as const

function Row({ label, value }: { label: string; value: string }) {
  return (
      <div className="flex items-center justify-between border-b border-blush-light/60 py-2.5 last:border-0">
        <span className="font-body text-sm text-ink/60">{label}</span>
        <span className="font-body text-sm font-semibold tabular-nums text-ink">{value}</span>
      </div>
  )
}

// ===== CHANGED: added the "linkedTaskTitle" prop below (was just session + onDismiss before) =====
function SessionSummary({
                          session,
                          linkedTaskTitle,
                          onDismiss,
                        }: {
  session: StudySession
  linkedTaskTitle?: string | null
  onDismiss: () => void
}) {
  const classification = session.sessionClassification ?? 'INVALID'
  const style = CLASSIFICATION_STYLE[classification]
  // ===== CHANGED: new line — decides whether to show the "task completed" note =====
  const taskWasAutoCompleted = classification === 'VALID' && Boolean(linkedTaskTitle)
  // pet is null only while PetContext's own initial fetch is still in
  // flight — SessionSummary only ever mounts after a session has
  // already finished, by which point the dashboard's pet fetch has
  // long since resolved, so this is a defensive null-check more than
  // a realistic loading state.
  const { pet } = usePet()

  return (
      <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="mx-auto w-full max-w-md rounded-[2.5rem] border border-white/60 bg-white/60 p-8 text-center shadow-[0_24px_70px_-20px_rgba(224,112,158,0.45)] backdrop-blur-xl"
      >
        <RewardCelebration />

        <span
            className={`inline-block rounded-full px-4 py-1.5 font-display text-xs font-semibold uppercase tracking-widest ${style.badge}`}
        >
        {classification}
      </span>
        <h2 className="mt-3 font-display text-2xl font-semibold text-ink">{style.title}</h2>
        <p className="mt-1 font-body text-sm text-ink/60">{style.note}</p>

        {/* ===== CHANGED: new block — only renders when taskWasAutoCompleted is true ===== */}
        {taskWasAutoCompleted && (
            <p className="mt-3 rounded-2xl bg-matcha-light/60 px-4 py-2 font-body text-sm text-ink">
              ✓ Marked <span className="font-semibold">"{linkedTaskTitle}"</span> as complete
            </p>
        )}

        <div className="mt-6 rounded-3xl bg-white/70 px-6 py-3 text-left">
          <Row label="Planned duration" value={formatDuration(session.plannedDurationSeconds)} />
          <Row label="Actual study time" value={formatDuration(session.accumulatedStudySeconds)} />
          <Row label="Focused" value={formatDuration(session.focusedSeconds)} />
          <Row label="Distracted" value={formatDuration(session.distractedSeconds)} />
          <Row label="Away from desk" value={formatDuration(session.noFaceSeconds)} />
          {session.drowsySeconds > 0 && (
            <Row label="Eyes closed" value={formatDuration(session.drowsySeconds)} />
          )}
          {session.phoneSeconds > 0 && (
            <Row label="Phone in hand" value={formatDuration(session.phoneSeconds)} />
          )}
          <Row
              label="Focus score"
              value={session.focusScore !== null ? `${session.focusScore} / 100` : 'no camera data'}
          />
          <Row
              label="Completion"
              value={
                session.completionRatio !== null
                    ? `${Math.round(session.completionRatio * 100)}%`
                    : '—'
              }
          />
          <Row label="Ended as" value={session.status} />
        </div>

        {session.focusScore !== null && <FocusTimelineChart sessionId={session.id} />}

        {pet && (
          <ShareRecapButton
            data={{
              petName: pet.name,
              equippedSkin: pet.equippedSkin,
              focusScore: session.focusScore,
              studyTimeLabel: formatDuration(session.accumulatedStudySeconds),
              currentStreak: pet.currentStreak,
              classification,
              dateLabel: new Date().toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }),
            }}
          />
        )}

        <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={onDismiss}
            className="mt-6 rounded-full bg-taro px-7 py-3 font-body text-sm font-semibold text-white shadow-lg shadow-taro/30 transition-colors hover:bg-taro-dark"
        >
          Start another session
        </motion.button>
      </motion.div>
  )
}

export default SessionSummary