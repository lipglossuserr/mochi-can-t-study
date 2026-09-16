interface CommunityEmptyStateProps {
  searching: boolean
  onCreate: () => void
}

/** Shown when the discover feed (or a search within it) has zero results. Same glass-card convention as `TaskEmptyState`. */
function CommunityEmptyState({ searching, onCreate }: CommunityEmptyStateProps) {
  return (
    <div className="rounded-[2.5rem] border border-white/50 bg-white/45 p-10 text-center shadow-[0_20px_60px_-15px_rgba(224,112,158,0.4)] backdrop-blur-xl">
      <p className="text-4xl" aria-hidden="true">
        {searching ? '🔍' : '🐈'}
      </p>
      <h2 className="mt-3 font-display text-xl font-semibold text-ink">
        {searching ? 'No communities match that search' : 'No paw prints here yet'}
      </h2>
      <p className="mt-2 font-body text-sm text-ink/60">
        {searching
          ? 'Try a different search, or start one of your own.'
          : 'Be the first to start one — iUT, a study group, a subject lounge, whatever your people need.'}
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="cat-ears relative mt-6 rounded-full bg-taro px-6 py-2.5 font-body text-sm font-semibold text-white shadow-lg shadow-taro/30 transition-colors hover:bg-taro-dark"
      >
        + New community
      </button>
    </div>
  )
}

export default CommunityEmptyState
