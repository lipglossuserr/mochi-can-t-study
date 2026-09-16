import type { Task } from '@/features/tasks'

/**
 * Optional task picker for a new session, shown on the Study Room's
 * "ready to focus" screen right alongside `DurationSelector` — same
 * label/input styling, same disabled-while-pending convention.
 *
 * Linking a task is entirely optional and never blocks starting a
 * session: a failed task fetch just hides the picker (see the `error`
 * branch below) rather than surfacing a scary error on the one screen
 * whose real job is "let me start studying".
 */
function TaskSelector({
  tasks,
  loading,
  error,
  selectedTaskId,
  onChange,
  disabled,
}: {
  tasks: Task[]
  loading: boolean
  error: string | null
  selectedTaskId: number | null
  onChange: (taskId: number | null) => void
  disabled?: boolean
}) {
  if (loading) {
    return (
      <div className="mt-6 flex flex-col items-center gap-2" aria-busy="true">
        <div className="h-3 w-40 animate-pulse rounded-full bg-blush-light/70" />
        <div className="h-10 w-full max-w-xs animate-pulse rounded-full bg-blush-light/50" />
      </div>
    )
  }

  if (error) {
    return (
      <p className="mt-4 font-body text-xs text-ink/40">
        Couldn't load your tasks — you can still start without one.
      </p>
    )
  }

  if (tasks.length === 0) {
    return null
  }

  return (
    <div className="mt-6">
      <label htmlFor="session-task" className="font-display text-sm font-semibold text-ink/80">
        Studying for a task?{' '}
        <span className="font-body font-normal text-ink/40">(optional)</span>
      </label>

      <div className="mt-3 flex justify-center">
        <select
          id="session-task"
          disabled={disabled}
          value={selectedTaskId ?? ''}
          onChange={(event) =>
            onChange(event.target.value ? Number(event.target.value) : null)
          }
          className="w-full max-w-xs rounded-full border border-blush-light bg-white/80 px-4 py-2.5 text-center font-body text-sm text-ink outline-none focus:border-taro focus:ring-2 focus:ring-taro/30 disabled:opacity-50"
        >
          <option value="">No linked task</option>
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default TaskSelector
