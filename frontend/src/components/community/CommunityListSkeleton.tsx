/** Shown while the discover feed loads, same `animate-pulse` convention as `TaskListSkeleton`. */
function CommunityListSkeleton() {
  return (
    <div
      className="grid animate-pulse grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Loading communities"
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex flex-col gap-3 rounded-[2rem] border border-white/50 bg-white/35 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 rounded-2xl bg-blush-light/70" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded-full bg-blush-light/70" />
              <div className="h-3 w-1/3 rounded-full bg-blush-light/50" />
            </div>
          </div>
          <div className="h-3 w-full rounded-full bg-blush-light/50" />
          <div className="h-6 w-24 rounded-full bg-blush-light/50" />
        </div>
      ))}
    </div>
  )
}

export default CommunityListSkeleton
