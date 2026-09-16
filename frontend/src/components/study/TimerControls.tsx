import { motion } from 'framer-motion'
import type { SessionStatus } from '@/types/studySession'

/**
 * Pause / Resume / Stop for a live session. Buttons disable while a
 * request is in flight, so double-clicks can never fire twice (the
 * backend guards against duplicates too).
 */
function TimerControls({
  status,
  pending,
  onPause,
  onResume,
  onStopRequested,
}: {
  status: SessionStatus
  pending: boolean
  onPause: () => void
  onResume: () => void
  onStopRequested: () => void
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      {status === 'RUNNING' && (
        <motion.button
          type="button"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          disabled={pending}
          onClick={onPause}
          className="rounded-full bg-white/80 px-7 py-3 font-body text-sm font-semibold text-taro shadow-md shadow-taro/10 transition-colors hover:bg-blush-light disabled:opacity-50"
        >
          Pause
        </motion.button>
      )}

      {status === 'PAUSED' && (
        <motion.button
          type="button"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          disabled={pending}
          onClick={onResume}
          className="rounded-full bg-taro px-7 py-3 font-body text-sm font-semibold text-white shadow-lg shadow-taro/30 transition-colors hover:bg-taro-dark disabled:opacity-50"
        >
          Resume
        </motion.button>
      )}

      <motion.button
        type="button"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        disabled={pending}
        onClick={onStopRequested}
        className="rounded-full border border-blush px-7 py-3 font-body text-sm font-semibold text-berry transition-colors hover:bg-blush-light disabled:opacity-50"
      >
        Stop
      </motion.button>
    </div>
  )
}

export default TimerControls
