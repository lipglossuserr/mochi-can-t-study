/**
 * Shown while the pet is loading, so the dashboard never has empty
 * space where Mochi is about to appear.
 */
function PetSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading Mochi">
      <div className="rounded-[2.5rem] border border-white/50 bg-white/40 p-8 text-center backdrop-blur-xl sm:p-10">
        <div className="mx-auto h-3 w-24 rounded-full bg-blush-light/70" />
        <div className="mx-auto mt-6 h-48 w-48 rounded-full bg-blush-light/60 sm:h-56 sm:w-56" />
        <div className="mx-auto mt-6 h-5 w-32 rounded-full bg-blush-light/70" />
        <div className="mx-auto mt-2 h-3 w-40 rounded-full bg-blush-light/50" />
      </div>

      <div className="mt-6 h-16 rounded-[1.75rem] border border-white/50 bg-white/35 backdrop-blur-xl" />

      <div className="mt-6 grid grid-cols-1 gap-4 rounded-[1.75rem] border border-white/50 bg-white/35 p-5 backdrop-blur-xl sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-8 rounded-full bg-blush-light/50" />
        ))}
      </div>
    </div>
  )
}

export default PetSkeleton
