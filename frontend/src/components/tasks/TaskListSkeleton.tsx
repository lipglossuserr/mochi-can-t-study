/**
 * Shown while the task list is loading, same `animate-pulse` block
 * convention as `features/pet/components/PetSkeleton.tsx`.
 */
function TaskListSkeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-busy="true" aria-label="Loading tasks">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-[1.75rem] border border-white/50 bg-white/35 p-5 backdrop-blur-xl"
        >
          <div className="h-5 w-5 shrink-0 rounded-full bg-blush-light/70" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 rounded-full bg-blush-light/70" />
            <div className="h-3 w-1/3 rounded-full bg-blush-light/50" />
          </div>
          <div className="h-6 w-16 shrink-0 rounded-full bg-blush-light/50" />
        </div>
      ))}
    </div>
  )
}

export default TaskListSkeleton
