import { motion } from 'framer-motion'
import { formatGoalProgressLabel, getGoalProgress } from '@/features/daily-goals'
import type { DailyGoal } from '@/features/daily-goals'

/**
 * Linear progress indicator for one goal card — same visual convention
 * as `features/pet/components/XPBar.tsx` (rounded track, gradient
 * fill, animated width), scaled down for a card context instead of the
 * page-level XP bar. Percent/label are always derived from the
 * server-provided `currentValue`/`targetValue` — never computed or
 * incremented here, per this sprint's "no auto-updating progress"
 * scope.
 */
function GoalProgressBar({ goal }: { goal: DailyGoal }) {
  const { percent } = getGoalProgress(goal)
  const label = formatGoalProgressLabel(goal)
  const isComplete = goal.status === 'COMPLETED'

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between">
        <p className="font-body text-xs font-semibold text-ink/60">Progress</p>
        <p className="font-body text-xs text-ink/50">{label}</p>
      </div>
      <div
        className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-blush-light/70"
        role="progressbar"
        aria-label={`Progress toward "${goal.title}"`}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className={`h-full rounded-full ${
            isComplete ? 'bg-matcha' : 'bg-gradient-to-r from-taro to-blush'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

export default GoalProgressBar
