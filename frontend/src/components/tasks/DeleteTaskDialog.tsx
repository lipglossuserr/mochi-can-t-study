import { motion, AnimatePresence } from 'framer-motion'
import type { Task } from '@/features/tasks'

interface DeleteTaskDialogProps {
  task: Task
  deleting: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Delete confirmation — same shell, copy rhythm, and button layout as
 * the "End this session early?" dialog in `StudyRoomPage.tsx` (keep
 * going / destructive action), reused here instead of a bespoke modal.
 */
function DeleteTaskDialog({ task, deleting, onConfirm, onCancel }: DeleteTaskDialogProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-6 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          className="w-full max-w-sm rounded-[2rem] bg-cream p-8 text-center shadow-2xl"
        >
          <h3 className="font-display text-lg font-semibold text-ink">Delete this task?</h3>
          <p className="mt-2 font-body text-sm text-ink/60">
            "{task.title}" will be permanently removed. This can't be undone.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={deleting}
              className="rounded-full bg-white px-6 py-2.5 font-body text-sm font-semibold text-ink/70 shadow hover:bg-blush-light disabled:opacity-60"
            >
              Keep task
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              className="rounded-full bg-berry px-6 py-2.5 font-body text-sm font-semibold text-white shadow hover:opacity-90 disabled:opacity-60"
            >
              {deleting ? 'Deleting…' : 'Delete task'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default DeleteTaskDialog
