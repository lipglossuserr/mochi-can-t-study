import { useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Task, TaskPriority, TaskWriteRequest } from '@/features/tasks'
import { toDateInputValue } from '@/features/tasks/utils/formatTaskDate'

interface TaskFormModalProps {
  mode: 'create' | 'edit'
  task?: Task | null
  submitting: boolean
  error: string | null
  onSubmit: (payload: TaskWriteRequest) => Promise<boolean>
  onClose: () => void
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
]

/**
 * Shared Create/Edit form, same modal shell (backdrop-blur overlay +
 * scale-in card) as the "End this session early?" confirm dialog in
 * `StudyRoomPage.tsx`, and the same input styling as `RegisterPage`'s
 * form fields (`rounded-2xl border border-white/60 bg-white/70 …`).
 * One component for both modes — creating and editing a task share
 * every field, so a second near-identical form isn't warranted.
 */
function TaskFormModal({ mode, task, submitting, error, onSubmit, onClose }: TaskFormModalProps) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [dueDate, setDueDate] = useState(toDateInputValue(task?.dueDate ?? null))
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'MEDIUM')
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setValidationError('Give your task a title first ♡')
      return
    }
    setValidationError(null)

    const ok = await onSubmit({
      title: trimmedTitle,
      description: description.trim() ? description.trim() : null,
      dueDate: dueDate || null,
      priority,
    })
    if (ok) onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-6 py-10 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          onClick={(event) => event.stopPropagation()}
          className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] bg-cream p-8 shadow-2xl"
        >
          <h3 className="font-display text-lg font-semibold text-ink">
            {mode === 'create' ? 'New task' : 'Edit task'}
          </h3>

          {(validationError || error) && (
            <p className="mt-3 rounded-2xl bg-blush/20 px-4 py-2 text-center font-body text-sm text-berry">
              {validationError ?? error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            <div>
              <label htmlFor="task-title" className="font-body text-xs font-semibold text-ink/60">
                Title
              </label>
              <input
                id="task-title"
                type="text"
                placeholder="What needs doing?"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={submitting}
                autoFocus
                className="mt-1.5 w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 font-body text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-taro disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="task-description" className="font-body text-xs font-semibold text-ink/60">
                Description <span className="font-normal text-ink/35">(optional)</span>
              </label>
              <textarea
                id="task-description"
                placeholder="Any extra details…"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={submitting}
                rows={3}
                className="mt-1.5 w-full resize-none rounded-2xl border border-white/60 bg-white/70 px-4 py-3 font-body text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-taro disabled:opacity-60"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="task-due-date" className="font-body text-xs font-semibold text-ink/60">
                  Due date <span className="font-normal text-ink/35">(optional)</span>
                </label>
                <input
                  id="task-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  disabled={submitting}
                  className="mt-1.5 w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 font-body text-sm text-ink focus:outline-none focus:ring-2 focus:ring-taro disabled:opacity-60"
                />
              </div>

              <div className="flex-1">
                <label htmlFor="task-priority" className="font-body text-xs font-semibold text-ink/60">
                  Priority
                </label>
                <select
                  id="task-priority"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as TaskPriority)}
                  disabled={submitting}
                  className="mt-1.5 w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 font-body text-sm text-ink focus:outline-none focus:ring-2 focus:ring-taro disabled:opacity-60"
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-full bg-white px-6 py-2.5 font-body text-sm font-semibold text-ink/70 shadow hover:bg-blush-light disabled:opacity-60"
              >
                Cancel
              </button>
              <motion.button
                type="submit"
                whileHover={{ scale: submitting ? 1 : 1.02 }}
                whileTap={{ scale: submitting ? 1 : 0.97 }}
                disabled={submitting}
                className="rounded-full bg-taro px-6 py-2.5 font-body text-sm font-semibold text-white shadow-lg shadow-taro/30 transition-colors hover:bg-taro-dark disabled:opacity-60"
              >
                {submitting
                  ? mode === 'create'
                    ? 'Creating…'
                    : 'Saving…'
                  : mode === 'create'
                    ? 'Create task'
                    : 'Save changes'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default TaskFormModal
