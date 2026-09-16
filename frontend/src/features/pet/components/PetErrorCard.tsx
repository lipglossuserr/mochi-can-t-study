interface PetErrorCardProps {
  message: string
  onRetry: () => void
}

/** Friendly retry card shown when the pet fails to load — never raw HTTP errors. */
function PetErrorCard({ message, onRetry }: PetErrorCardProps) {
  return (
    <div className="rounded-[2.5rem] border border-white/50 bg-white/45 p-10 text-center shadow-[0_20px_60px_-15px_rgba(224,112,158,0.4)] backdrop-blur-xl">
      <p className="text-4xl" aria-hidden="true">
        🐣
      </p>
      <p className="mt-3 font-display text-lg font-semibold text-ink">
        Mochi couldn't come out to play
      </p>
      <p className="mt-2 font-body text-sm text-ink/60">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        aria-label="Retry loading Mochi"
        className="mt-6 rounded-full bg-gradient-to-r from-taro to-blush px-6 py-2.5 font-body text-sm font-semibold text-white shadow transition-transform hover:scale-[1.02]"
      >
        Try again
      </button>
    </div>
  )
}

export default PetErrorCard
