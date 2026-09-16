import type { Report } from '@/features/community'
import { REPORT_REASON_LABELS } from '@/features/community'

interface ModerationReportRowProps {
  report: Report
  deciding: boolean
  onDismiss: () => void
  onRemoveContent: () => void
  onBanAuthor: () => void
}

/**
 * One row in the moderator report queue — Community Rooms, Phase 5.
 * The three actions (Dismiss / Remove Content / Ban) are exactly the
 * design doc's `ModerationQueueRow` spec, same three-button shape
 * `MemberRow`'s Approve/Reject already establishes for the pending-
 * membership queue, just with a third action.
 */
function ModerationReportRow({ report, deciding, onDismiss, onRemoveContent, onBanAuthor }: ModerationReportRowProps) {
  const targetLabel = report.postId
    ? `Post #${report.postId}`
    : report.blogPostId
      ? `Blog post #${report.blogPostId}`
      : `Comment #${report.commentId}`

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/50 bg-white/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-body text-sm font-semibold text-ink">{targetLabel}</p>
          <p className="font-body text-xs text-ink/50">
            Reported by {report.reporterUid} · {REPORT_REASON_LABELS[report.reason]}
          </p>
        </div>
        <span className="font-body text-xs text-ink/30">{new Date(report.createdAt).toLocaleDateString()}</span>
      </div>

      {report.note && <p className="rounded-xl bg-white/60 px-3 py-2 font-body text-xs text-ink/70">{report.note}</p>}

      <div className="mt-1 flex gap-2">
        <button
          type="button"
          disabled={deciding}
          onClick={onDismiss}
          className="flex-1 rounded-full border border-white/60 bg-white/70 px-3 py-1.5 font-body text-xs font-semibold text-ink/60 hover:bg-white disabled:opacity-60"
        >
          Dismiss
        </button>
        <button
          type="button"
          disabled={deciding}
          onClick={onRemoveContent}
          className="flex-1 rounded-full border border-butter/60 bg-butter/40 px-3 py-1.5 font-body text-xs font-semibold text-berry hover:bg-butter/60 disabled:opacity-60"
        >
          Remove content
        </button>
        <button
          type="button"
          disabled={deciding}
          onClick={onBanAuthor}
          className="flex-1 rounded-full bg-berry px-3 py-1.5 font-body text-xs font-semibold text-white hover:bg-berry/90 disabled:opacity-60"
        >
          Ban
        </button>
      </div>
    </div>
  )
}

export default ModerationReportRow
