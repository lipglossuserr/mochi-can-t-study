import { useState } from 'react'
import FadeInSection from '@/components/FadeInSection'
import Toast from '@/components/Toast'
import { useCommunities, useCreateCommunity } from '@/features/community'
import CommunityCard from '@/components/community/CommunityCard'
import CommunityListSkeleton from '@/components/community/CommunityListSkeleton'
import CommunityErrorState from '@/components/community/CommunityErrorState'
import CommunityEmptyState from '@/components/community/CommunityEmptyState'
import CreateCommunityModal from '@/components/community/CreateCommunityModal'

/**
 * Community Rooms, Phase 1 — the discover feed. Replaces the
 * `ComingSoonPage` stub that previously lived at `/community` in
 * `AppRouter.tsx`. Every PUBLIC community, plus any PRIVATE one the
 * caller has a relationship with, in one searchable grid; tapping a
 * card goes to `CommunityRoomPage` (`/community/:slug`), which owns
 * the join/leave/pending-approval flow for that one community.
 * <p>
 * Same page composition convention as `TasksPage`: this component owns
 * only the bits of local UI state that genuinely belong to the page
 * (the search box, whether the create modal is open) — every fetch and
 * mutation comes from `features/community` hooks.
 */
function CommunityDiscoverPage() {
  const [search, setSearch] = useState('')
  const { communities, loading, error, reload } = useCommunities(search.trim() || undefined)
  const { create, creating, error: createError, dismissError } = useCreateCommunity()
  const [showCreateModal, setShowCreateModal] = useState(false)

  const handleCreate = async (payload: Parameters<typeof create>[0]) => {
    const created = await create(payload)
    if (created) {
      await reload()
      return true
    }
    return false
  }

  return (
    <div className="cat-cursor mx-auto max-w-5xl px-4 pb-16 pt-10 sm:px-6">
      <FadeInSection>
        <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-white/70 via-white/50 to-blush-light/40 px-7 py-9 shadow-[0_24px_70px_-24px_rgba(168,106,138,0.45)] backdrop-blur-xl sm:px-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-taro-light/50 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-blush-light/50 blur-3xl"
          />

          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 font-body text-[11px] font-semibold uppercase tracking-wide text-taro-dark shadow-sm">
                  🐾 Community Rooms
                </span>
                <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                  Find your people
                </h1>
                <p className="mt-2 max-w-md font-body text-sm leading-relaxed text-ink/60">
                  Join iUT, share your study room, ask for help, or just vent — every
                  community here is its own cozy little corner.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="cat-ears group inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-taro px-6 py-3 font-body text-sm font-semibold text-white shadow-lg shadow-taro/35 transition-all hover:-translate-y-0.5 hover:bg-taro-dark hover:shadow-xl hover:shadow-taro/40"
              >
                <span className="text-base leading-none transition-transform group-hover:rotate-90">+</span>
                New community
              </button>
            </div>

            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/35">
                🔍
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search communities…"
                aria-label="Search communities"
                className="w-full rounded-full border border-white/70 bg-white/80 py-3.5 pl-11 pr-5 font-body text-sm text-ink shadow-sm outline-none transition-shadow placeholder:text-ink/35 focus:border-taro focus:shadow-md focus:shadow-taro/10"
              />
            </div>
          </div>
        </div>
      </FadeInSection>

      <div className="mt-8">
        {!loading && !error && communities.length > 0 && (
          <p className="mb-4 font-body text-xs font-semibold uppercase tracking-wide text-ink/40">
            {communities.length} communit{communities.length === 1 ? 'y' : 'ies'}
            {search.trim() && ` matching "${search.trim()}"`}
          </p>
        )}

        {loading ? (
          <CommunityListSkeleton />
        ) : error ? (
          <CommunityErrorState message={error} onRetry={reload} />
        ) : communities.length === 0 ? (
          <CommunityEmptyState searching={search.trim().length > 0} onCreate={() => setShowCreateModal(true)} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {communities.map((community, index) => (
              <FadeInSection key={community.id} delay={Math.min(index * 0.04, 0.3)}>
                <CommunityCard community={community} />
              </FadeInSection>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateCommunityModal
          submitting={creating}
          error={createError}
          onSubmit={handleCreate}
          onClose={() => {
            setShowCreateModal(false)
            dismissError()
          }}
        />
      )}

      <div className="fixed inset-x-0 top-4 z-40 flex justify-center px-4">
        <Toast message={createError} tone="error" onDismiss={dismissError} />
      </div>
    </div>
  )
}

export default CommunityDiscoverPage
