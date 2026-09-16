import { AnimatePresence, motion } from 'framer-motion'

interface RewardPanelProps {
  visible: boolean
  xpGained: number
  coinsGained: number
  leveledUp: boolean
}

/**
 * RewardPanel
 *
 * The small "here's what you earned" summary shown after a study
 * session completes — e.g. "+50 XP", "+25 Coins", "Level Up!". Purely
 * presentational: PetContext decides *when* it's visible and for how
 * long (a few seconds), this component just animates in and out.
 */
function RewardPanel({ visible, xpGained, coinsGained, leveledUp }: RewardPanelProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -6 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          role="status"
          aria-live="polite"
          className="mx-auto mt-4 flex w-fit flex-col items-center gap-1 rounded-3xl border border-white/60 bg-white/80 px-6 py-4 shadow-[0_16px_40px_-12px_rgba(224,112,158,0.5)] backdrop-blur-xl"
        >
          {leveledUp && (
            <motion.p
              initial={{ scale: 0.7 }}
              animate={{ scale: [0.7, 1.15, 1] }}
              transition={{ duration: 0.5 }}
              className="font-display text-base font-bold text-taro"
            >
              Level Up! 🎉
            </motion.p>
          )}
          {xpGained > 0 && (
            <p className="font-body text-sm font-semibold text-ink/80">+{xpGained} XP</p>
          )}
          {coinsGained > 0 && (
            <p className="font-body text-sm font-semibold text-ink/80">+{coinsGained} Coins 🪙</p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default RewardPanel
