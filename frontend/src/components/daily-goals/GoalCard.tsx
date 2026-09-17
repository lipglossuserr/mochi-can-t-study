import { motion } from 'framer-motion'
import type { DailyGoal } from '@/features/daily-goals'
import GoalProgressBar from './GoalProgressBar'
import GoalCompletionBadge from './GoalCompletionBadge'

interface GoalCardProps {
  goal: DailyGoal
  onEdit: (goal: DailyGoal) => void
  onDeleteRequest: (goal: DailyGoal) => void
  saving: boolean
  deleting: boolean
}

/**
 * One goal card. Same rounded glass-card convention as
 * `components/tasks/TaskListItem.tsx` (corners, blur, border, busy-state
 * opacity), restructured for a progress bar instead of a
 * complete/reopen toggle — a Daily Goal's "done" state is read-only
 * here (see this feature's hooks doc comments), so the card's own
 * actions are only Edit and Delete.
 */
function GoalCard({ goal, onEdit, onDeleteRequest, saving, deleting }: GoalCardProps) {
  const isCompleted = goal.status === 'COMPLETED'
  const busy = saving || deleting

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`glow-hover rounded-[1.75rem] border border-white/50 bg-white/45 p-5 shadow-sm backdrop-blur-xl transition-opacity ${
        busy ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={`break-words font-body text-sm font-semibold text-ink ${
              isCompleted ? 'text-ink/50' : ''
            }`}
          >
            {goal.title}
          </p>
          {goal.description && (
            <p className="mt-1 line-clamp-2 break-words font-body text-xs text-ink/55">
              {goal.description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(goal)}
            disabled={busy}
            aria-label={`Edit "${goal.title}"`}
            className="rounded-full p-2 font-body text-sm text-ink/50 transition-all duration-150 hover:scale-110 hover:bg-blush-light hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={() => onDeleteRequest(goal)}
            disabled={busy}
            aria-label={`Delete "${goal.title}"`}
            className="rounded-full p-2 font-body text-sm text-ink/50 transition-all duration-150 hover:scale-110 hover:bg-blush-light hover:text-berry disabled:cursor-not-allowed disabled:opacity-50"
          >
            🗑
          </button>
        </div>
      </div>

      <div className="mt-4">
        <GoalProgressBar goal={goal} />
      </div>

      {isCompleted && (
        <div className="mt-3">
          <GoalCompletionBadge status={goal.status} />
        </div>
      )}
    </motion.div>
  )
}

export default GoalCard
