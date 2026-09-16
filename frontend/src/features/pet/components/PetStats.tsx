import type { Pet } from '../types/pet'
import AnimatedNumber from './AnimatedNumber'

interface StatRowProps {
  emoji: string
  label: string
  value: number
  barColorClass: string
}

/** One mood/hunger/bond row: icon + label + a filled, animated progress bar. */
function StatRow({ emoji, label, value, barColorClass }: StatRowProps) {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-body text-xs font-semibold text-ink/70">
          <span aria-hidden="true">{emoji}</span>
          {label}
        </span>
        <span className="font-body text-xs text-ink/50">
          <AnimatedNumber value={clamped} formatter={(v) => `${v}%`} />
        </span>
      </div>
      <div
        className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-white/70"
        role="progressbar"
        aria-label={label}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full ${barColorClass}`}
          style={{ width: `${clamped}%`, transition: 'width 0.4s ease-out' }}
        />
      </div>
    </div>
  )
}

interface PetStatsProps {
  pet: Pick<Pet, 'mood' | 'hunger' | 'bond' | 'coins'>
}

/** Mood, hunger, bond, and coins — the four at-a-glance pet stats. */
function PetStats({ pet }: PetStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-[1.75rem] border border-white/50 bg-white/40 p-5 backdrop-blur-xl sm:grid-cols-2">
      <StatRow emoji="😊" label="Mood" value={pet.mood} barColorClass="bg-blush" />
      <StatRow emoji="🍖" label="Hunger" value={pet.hunger} barColorClass="bg-butter" />
      <StatRow emoji="💖" label="Bond" value={pet.bond} barColorClass="bg-taro" />
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">
          🪙
        </span>
        <AnimatedNumber
          value={pet.coins}
          className="font-display text-lg font-semibold text-ink/80"
        />
        <span className="font-body text-xs text-ink/50">coins</span>
      </div>
    </div>
  )
}

export default PetStats
