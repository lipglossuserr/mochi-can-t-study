interface CommunityErrorStateProps {
  message: string
  onRetry: () => void
}

/** Retry card shown when the discover feed or a single community fails to load — same convention as `TaskErrorState`. */
function CommunityErrorState({ message, onRetry }: CommunityErrorStateProps) {
  return (
    <div className="rounded-[2.5rem] border border-white/50 bg-white/45 p-10 text-center shadow-[0_20px_60px_-15px_rgba(224,112,158,0.4)] backdrop-blur-xl">
      <p className="text-4xl" aria-hidden="true">
        🌧️
      </p>
      <p className="mt-3 font-display text-lg font-semibold text-ink">Couldn't load communities</p>
      <p className="mt-2 font-body text-sm text-ink/60">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        aria-label="Retry loading communities"
        className="mt-6 rounded-full bg-gradient-to-r from-taro to-blush px-6 py-2.5 font-body text-sm font-semibold text-white shadow transition-transform hover:scale-[1.02]"
      >
        Try again
      </button>
    </div>
  )
}

export default CommunityErrorState
