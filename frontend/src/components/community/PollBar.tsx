import { motion } from 'framer-motion'
import type { PollOption } from '@/features/community'

interface PollBarProps {
  options: PollOption[]
  callerVotedOptionId: number | null
  disabled?: boolean
  onVote: (optionId: number) => void
}

/**
 * Renders a poll's options two ways: unvoted (tappable buttons) or
 * voted (result bars, the caller's own choice outlined in taro). Bar
 * fill animates on mount with `--motion-medium`/`--ease-settle`
 * (mirrored here via framer-motion, same easing curve as the CSS
 * tokens) and respects `prefers-reduced-motion` since framer-motion
 * reads that automatically. Results are announced via `aria-live` so
 * screen readers get the vote-count update without re-focusing.
 */
function PollBar({ options, callerVotedOptionId, disabled, onVote }: PollBarProps) {
  const totalVotes = options.reduce((sum, o) => sum + o.voteCount, 0)
  const hasVoted = callerVotedOptionId !== null

  if (!hasVoted) {
    return (
      <div className="mt-3 flex flex-col gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onVote(option.id)}
            className="rounded-2xl border border-taro/30 bg-white/60 px-4 py-2.5 text-left font-body text-sm text-ink/80 transition-colors hover:bg-taro/10 disabled:opacity-60"
          >
            {option.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="mt-3 flex flex-col gap-2" aria-live="polite">
      {options.map((option) => {
        const pct = totalVotes === 0 ? 0 : Math.round((option.voteCount / totalVotes) * 100)
        const isMine = option.id === callerVotedOptionId
        return (
          <div
            key={option.id}
            className={`relative overflow-hidden rounded-2xl border px-4 py-2.5 ${
              isMine ? 'border-taro' : 'border-white/60'
            }`}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.3, ease: [0.34, 1.3, 0.64, 1] }}
              className={`absolute inset-y-0 left-0 ${isMine ? 'bg-taro/20' : 'bg-blush/20'}`}
            />
            <div className="relative flex items-center justify-between font-body text-sm text-ink/80">
              <span>
                {option.label}
                {isMine && <span className="ml-1.5 text-xs text-taro-dark">· your vote</span>}
              </span>
              <span className="text-xs text-ink/50">{pct}%</span>
            </div>
          </div>
        )
      })}
      <p className="mt-0.5 font-body text-xs text-ink/40">
        {totalVotes} vote{totalVotes === 1 ? '' : 's'}
      </p>
    </div>
  )
}

export default PollBar
