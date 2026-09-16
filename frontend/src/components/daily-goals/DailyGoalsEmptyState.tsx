/**
 * Shown when there are no goals for today. Same rounded glass-card
 * convention as `components/tasks/TaskEmptyState.tsx`.
 */
function DailyGoalsEmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <div className="rounded-[2.5rem] border border-white/50 bg-white/45 p-10 text-center shadow-[0_20px_60px_-15px_rgba(224,112,158,0.4)] backdrop-blur-xl">
      <p className="text-4xl" aria-hidden="true">
        🎯
      </p>
      <h2 className="mt-3 font-display text-xl font-semibold text-ink">No goals set for today</h2>
      <p className="mt-2 font-body text-sm text-ink/60">
        Add a goal to give today some shape ♡
      </p>
      {onCreate && (
        <button
          type="button"
          onClick={onCreate}
          className="mt-6 rounded-full bg-taro px-6 py-2.5 font-body text-sm font-semibold text-white shadow-lg shadow-taro/30 transition-colors hover:bg-taro-dark"
        >
          + New goal
        </button>
      )}
    </div>
  )
}

export default DailyGoalsEmptyState
