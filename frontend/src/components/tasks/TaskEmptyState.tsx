import type { TaskStatus } from '@/features/tasks'

const COPY: Record<TaskStatus, { emoji: string; title: string; description: string }> = {
  PENDING: {
    emoji: '🌱',
    title: 'Nothing on your plate',
    description: 'You have no pending tasks — add one whenever you\u2019re ready ♡',
  },
  COMPLETED: {
    emoji: '✨',
    title: 'No completed tasks yet',
    description: 'Finished tasks will show up here, along with when you completed them.',
  },
}

/**
 * Shown when the current filter has zero tasks. Same rounded glass-card
 * convention as `ComingSoonPage`, with copy that depends on which tab
 * is active — an empty Pending list ("nothing on your plate") reads
 * very differently from an empty Completed list ("nothing finished
 * yet"), so this isn't a single generic "no items" message.
 */
function TaskEmptyState({ status, onCreate }: { status: TaskStatus; onCreate?: () => void }) {
  const copy = COPY[status]
  return (
    <div className="rounded-[2.5rem] border border-white/50 bg-white/45 p-10 text-center shadow-[0_20px_60px_-15px_rgba(224,112,158,0.4)] backdrop-blur-xl">
      <p className="text-4xl" aria-hidden="true">
        {copy.emoji}
      </p>
      <h2 className="mt-3 font-display text-xl font-semibold text-ink">{copy.title}</h2>
      <p className="mt-2 font-body text-sm text-ink/60">{copy.description}</p>
      {status === 'PENDING' && onCreate && (
        <button
          type="button"
          onClick={onCreate}
          className="mt-6 rounded-full bg-taro px-6 py-2.5 font-body text-sm font-semibold text-white shadow-lg shadow-taro/30 transition-colors hover:bg-taro-dark"
        >
          + New task
        </button>
      )}
    </div>
  )
}

export default TaskEmptyState
