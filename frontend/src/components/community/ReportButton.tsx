import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createReport, REPORT_REASON_LABELS } from '@/features/community'
import type { ReportReason, ReportTargetType } from '@/features/community'
import { friendlyMessage } from '@/features/pet/utils/apiErrors'

interface ReportButtonProps {
  slug: string
  targetType: ReportTargetType
  targetId: number
}

const REASONS: ReportReason[] = ['SPAM', 'HARASSMENT', 'OFF_TOPIC', 'OTHER']

/**
 * A small, self-contained "report this" affordance — Community Rooms,
 * Phase 5. Deliberately owns its own state (open/reason/note/submitted)
 * rather than threading a callback up through the parent card's props,
 * so it can be dropped into `PostCard`/`CommentThread`/`BlogPostPage`/
 * `BlogCommentThread` without touching any of their existing prop
 * chains. Collapses to a quiet "Reported" label after a successful
 * submit — there's no un-report action, matching the backend's
 * one-report-per-(reporter, content) rule.
 */
function ReportButton({ slug, targetType, targetId }: ReportButtonProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>('SPAM')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (submitted) {
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="font-body text-xs text-ink/30"
      >
        Reported
      </motion.span>
    )
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await createReport(slug, { targetType, targetId, reason, note: note.trim() || undefined })
      setSubmitted(true)
      setOpen(false)
    } catch (err) {
      setError(friendlyMessage(err, "Couldn't submit that report right now."))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative">
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen((prev) => !prev)}
        className="font-body text-xs text-ink/30 hover:text-berry"
      >
        🚩 Report
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 z-10 mt-2 w-64 rounded-2xl border border-white/60 bg-white/95 p-4 shadow-xl backdrop-blur-xl"
          >
            <p className="font-body text-xs font-semibold text-ink/70">Why are you reporting this?</p>
            <div className="mt-2 flex flex-col gap-1.5">
              {REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2 font-body text-xs text-ink/70">
                  <input
                    type="radio"
                    name={`report-reason-${targetType}-${targetId}`}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                  />
                  {REPORT_REASON_LABELS[r]}
                </label>
              ))}
            </div>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Add a note (optional)…"
              className="mt-2 w-full resize-none rounded-xl border border-white/60 bg-white/70 px-2.5 py-1.5 font-body text-xs text-ink outline-none focus:border-taro"
            />
            {error && <p className="mt-1.5 font-body text-xs text-berry">{error}</p>}
            <div className="mt-2 flex gap-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => setOpen(false)}
                className="flex-1 rounded-full border border-white/60 px-3 py-1.5 font-body text-xs font-semibold text-ink/60 hover:bg-white"
              >
                Cancel
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                disabled={submitting}
                onClick={handleSubmit}
                className="flex-1 rounded-full bg-berry px-3 py-1.5 font-body text-xs font-semibold text-white disabled:opacity-60"
              >
                {submitting ? 'Sending…' : 'Submit'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ReportButton
