import { useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DailyGoal, DailyGoalWriteRequest } from '@/features/daily-goals'

interface GoalFormModalProps {
  mode: 'create' | 'edit'
  goal?: DailyGoal | null
  submitting: boolean
  error: string | null
  onSubmit: (payload: DailyGoalWriteRequest) => Promise<boolean>
  onClose: () => void
}

/**
 * Shared Create/Edit form — same modal shell, input styling, and
 * validate-then-submit structure as `components/tasks/TaskFormModal.tsx`
 * (backdrop-blur overlay + scale-in card, `rounded-2xl border
 * border-white/60 bg-white/70 …` fields). One component for both
 * modes, same rationale as its Task counterpart: creating and editing
 * a goal share every field.
 *
 * Deliberately has no field for `currentValue`/`status` — those are
 * server-derived (see this feature's hooks), so a person only ever
 * sets what a goal *is*, never its progress.
 */
function GoalFormModal({ mode, goal, submitting, error, onSubmit, onClose }: GoalFormModalProps) {
  const [title, setTitle] = useState(goal?.title ?? '')
  const [description, setDescription] = useState(goal?.description ?? '')
  const [targetValue, setTargetValue] = useState(goal ? String(goal.targetValue) : '')
  const [unit, setUnit] = useState(goal?.unit ?? '')
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setValidationError('Give your goal a title first ♡')
      return
    }
    const parsedTarget = Number(targetValue)
    if (!targetValue || !Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      setValidationError('Set a target greater than zero')
      return
    }
    setValidationError(null)

    const ok = await onSubmit({
      title: trimmedTitle,
      description: description.trim() ? description.trim() : null,
      targetValue: parsedTarget,
      unit: unit.trim() ? unit.trim() : null,
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
            {mode === 'create' ? 'New daily goal' : 'Edit goal'}
          </h3>

          {(validationError || error) && (
            <p className="mt-3 rounded-2xl bg-blush/20 px-4 py-2 text-center font-body text-sm text-berry">
              {validationError ?? error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            <div>
              <label htmlFor="goal-title" className="font-body text-xs font-semibold text-ink/60">
                Title
              </label>
              <input
                id="goal-title"
                type="text"
                placeholder="What are you working toward today?"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={submitting}
                autoFocus
                className="mt-1.5 w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 font-body text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-taro disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="goal-description" className="font-body text-xs font-semibold text-ink/60">
                Description <span className="font-normal text-ink/35">(optional)</span>
              </label>
              <textarea
                id="goal-description"
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
                <label htmlFor="goal-target" className="font-body text-xs font-semibold text-ink/60">
                  Target
                </label>
                <input
                  id="goal-target"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 3"
                  value={targetValue}
                  onChange={(event) => setTargetValue(event.target.value)}
                  disabled={submitting}
                  className="mt-1.5 w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 font-body text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-taro disabled:opacity-60"
                />
              </div>

              <div className="flex-1">
                <label htmlFor="goal-unit" className="font-body text-xs font-semibold text-ink/60">
                  Unit <span className="font-normal text-ink/35">(optional)</span>
                </label>
                <input
                  id="goal-unit"
                  type="text"
                  placeholder="e.g. sessions"
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                  disabled={submitting}
                  className="mt-1.5 w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 font-body text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-taro disabled:opacity-60"
                />
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
                    ? 'Create goal'
                    : 'Save changes'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default GoalFormModal
