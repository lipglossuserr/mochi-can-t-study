import { motion } from 'framer-motion'
import { getXpProgress } from '../utils/xp'
import AnimatedNumber from './AnimatedNumber'
import type { Pet } from '../types/pet'

interface XPBarProps {
  pet: Pick<Pet, 'level' | 'xp'>
}

/**
 * Reusable XP progress bar. Never hardcodes a percentage — everything
 * is derived from the backend's level/xp values via getXpProgress().
 * The current-XP figure counts up via AnimatedNumber rather than
 * snapping, so a Feed/Play/session-complete refresh feels alive.
 */
function XPBar({ pet }: XPBarProps) {
  const { current, required, percent } = getXpProgress(pet)

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between">
        <p className="font-display text-sm font-semibold text-ink/80">
          Level {pet.level}
        </p>
        <p className="font-body text-xs text-ink/50">
          <AnimatedNumber value={current} /> / {required} XP
        </p>
      </div>
      <div
        className="mt-2 h-3 w-full overflow-hidden rounded-full bg-blush-light/70"
        role="progressbar"
        aria-label="Experience progress to next level"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-taro to-blush"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

export default XPBar
