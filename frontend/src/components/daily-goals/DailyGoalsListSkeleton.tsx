/**
 * Shown while today's goals are loading, same `animate-pulse` block
 * convention as `components/tasks/TaskListSkeleton.tsx`, with an extra
 * bar standing in for the progress indicator each goal card shows.
 */
function DailyGoalsListSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2" aria-busy="true" aria-label="Loading today's goals">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-[1.75rem] border border-white/50 bg-white/35 p-5 backdrop-blur-xl"
        >
          <div className="h-4 w-2/3 rounded-full bg-blush-light/70" />
          <div className="mt-2 h-3 w-1/3 rounded-full bg-blush-light/50" />
          <div className="mt-5 h-2.5 w-full rounded-full bg-blush-light/50" />
        </div>
      ))}
    </div>
  )
}

export default DailyGoalsListSkeleton
