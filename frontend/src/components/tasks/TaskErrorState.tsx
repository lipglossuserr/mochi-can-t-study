interface TaskErrorStateProps {
  message: string
  onRetry: () => void
}

/**
 * Retry card shown when the task list fails to load — same rounded
 * glass-card visual convention as `features/pet/components/PetErrorCard.tsx`,
 * with its own copy since that one's wording is pet-specific and only
 * ever mounts for the pet fetch.
 */
function TaskErrorState({ message, onRetry }: TaskErrorStateProps) {
  return (
    <div className="rounded-[2.5rem] border border-white/50 bg-white/45 p-10 text-center shadow-[0_20px_60px_-15px_rgba(224,112,158,0.4)] backdrop-blur-xl">
      <p className="text-4xl" aria-hidden="true">
        📋
      </p>
      <p className="mt-3 font-display text-lg font-semibold text-ink">
        Couldn't load your tasks
      </p>
      <p className="mt-2 font-body text-sm text-ink/60">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        aria-label="Retry loading tasks"
        className="mt-6 rounded-full bg-gradient-to-r from-taro to-blush px-6 py-2.5 font-body text-sm font-semibold text-white shadow transition-transform hover:scale-[1.02]"
      >
        Try again
      </button>
    </div>
  )
}

export default TaskErrorState
