import { motion } from 'framer-motion'
import XPBar from '@/features/pet/components/XPBar'
import type { Pet } from '@/features/pet/types/pet'

interface StatsSummaryProps {
  pet: Pet
}

/**
 * Reuses the exact `XPBar` shown in the room scenes — the level/xp
 * numbers here must never disagree with what's shown elsewhere, so
 * this deliberately doesn't reimplement that math, only composes it
 * with coins and streak alongside.
 */
function StatsSummary({ pet }: StatsSummaryProps) {
  return (
    <div className="rounded-[2.5rem] border border-white/50 bg-white/45 p-6 shadow-[0_20px_60px_-15px_rgba(224,112,158,0.4)] backdrop-blur-xl sm:p-8">
      <h2 className="font-display text-lg font-semibold text-ink">📊 Your Stats</h2>

      <div className="mt-5">
        <XPBar pet={pet} />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 text-center">
        <StatTile emoji="🪙" label="Coins" value={pet.coins} />
        <StatTile emoji="🔥" label="Streak" value={pet.currentStreak} suffix="d" />
        <StatTile emoji="🏅" label="Best streak" value={pet.longestStreak} suffix="d" />
      </div>
    </div>
  )
}

function StatTile({
  emoji,
  label,
  value,
  suffix,
}: {
  emoji: string
  label: string
  value: number
  suffix?: string
}) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.03 }}
      className="glow-hover cursor-default rounded-[1.5rem] border border-white/50 bg-white/40 p-4"
    >
      <motion.p
        className="text-xl"
        aria-hidden="true"
        whileHover={{ rotate: [0, -12, 12, 0] }}
        transition={{ duration: 0.4 }}
      >
        {emoji}
      </motion.p>
      <p className="mt-1 font-display text-base font-semibold text-ink">
        {value}
        {suffix}
      </p>
      <p className="font-body text-[11px] text-ink/50">{label}</p>
    </motion.div>
  )
}

export default StatsSummary
