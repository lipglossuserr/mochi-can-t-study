import { Link, useParams } from 'react-router-dom'
import FadeInSection from '@/components/FadeInSection'
import Toast from '@/components/Toast'
import CommunityErrorState from '@/components/community/CommunityErrorState'
import ModerationReportRow from '@/components/community/ModerationReportRow'
import { useReports } from '@/features/community'

/**
 * The moderator report queue — Community Rooms, Phase 5. Route:
 * `/community/:slug/reports`. A dedicated page rather than an inline
 * section on `CommunityRoomPage` (like the pending-membership queue
 * is) — a report's reason/note plus three review actions needs more
 * room than a compact inline card, same reasoning the blog composer
 * got its own page. Access isn't re-checked here — the backend 403s a
 * non-moderator's request, and `useReports` surfaces that as `error`.
 */
function ModerationQueuePage() {
  const { slug } = useParams<{ slug: string }>()
  const { reports, loading, error, dismiss, removeContent, banAuthor, actionPendingId, actionError, dismissActionError } =
    useReports(slug ?? '', 'PENDING')

  if (!slug) return null

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link to={`/community/${slug}`} className="font-body text-sm text-ink/50 hover:text-ink/80">
        ← Back to community
      </Link>

      <FadeInSection className="mt-4">
        <div className="rounded-[2.5rem] border border-white/50 bg-white/45 p-8 shadow-[0_20px_60px_-15px_rgba(224,112,158,0.4)] backdrop-blur-xl">
          <h1 className="font-display text-xl font-semibold text-ink">Reports</h1>
          <p className="mt-1 font-body text-sm text-ink/50">Pending reports awaiting review.</p>

          <div className="mt-6 flex flex-col gap-3">
            {loading && (
              <div className="animate-pulse rounded-2xl border border-white/50 bg-white/40 p-6" aria-busy="true" />
            )}

            {!loading && error && <CommunityErrorState message={error} onRetry={() => window.location.reload()} />}

            {!loading && !error && reports.length === 0 && (
              <p className="font-body text-sm text-ink/40">Nothing to review — the queue is empty ♡</p>
            )}

            {!loading &&
              !error &&
              reports.map((report) => (
                <ModerationReportRow
                  key={report.id}
                  report={report}
                  deciding={actionPendingId === report.id}
                  onDismiss={() => dismiss(report.id)}
                  onRemoveContent={() => removeContent(report.id)}
                  onBanAuthor={() => banAuthor(report.id)}
                />
              ))}
          </div>
        </div>
      </FadeInSection>

      <div className="fixed inset-x-0 top-4 z-40 flex justify-center px-4">
        <Toast message={actionError} tone="error" onDismiss={dismissActionError} />
      </div>
    </div>
  )
}

export default ModerationQueuePage
