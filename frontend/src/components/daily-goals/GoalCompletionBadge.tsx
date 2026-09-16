import type { GoalStatus } from '@/features/daily-goals'

/**
 * One glanceable completion pill, same visual language as
 * `components/tasks/PriorityBadge.tsx` (dot + label, rounded-full).
 * Renders nothing for a still-PENDING goal — the progress bar already
 * communicates "in progress"; a badge only earns its place once a
 * goal is actually done.
 */
function GoalCompletionBadge({ status }: { status: GoalStatus }) {
  if (status !== 'COMPLETED') return null

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-matcha-light px-2.5 py-1 font-body text-[11px] font-semibold text-ink">
      <span aria-hidden="true">✓</span>
      Completed
    </span>
  )
}

export default GoalCompletionBadge
