import { AnimatePresence, motion } from 'framer-motion'
import XPBar from './XPBar'
import AnimatedNumber from './AnimatedNumber'
import RewardPanel from './RewardPanel'
import { usePet } from '../hooks/usePet'

/**
 * RewardCelebration
 *
 * Drops into any screen that wants to show "you just earned rewards"
 * right after a study session finalizes. Fully self-driven off
 * PetContext's `celebration` state (the XP/coins/leveling economy is a
 * separate system from the Character Engine's emotional state) — mount
 * it once (e.g. inside SessionSummary) and it handles its own
 * appearance and auto-hide.
 *
 * No avatar is rendered here on purpose: this used to render its own
 * legacy RivePet widget (driving the .riv file's State Machine
 * directly, bypassing the Character Engine). StudyRoomPage now keeps
 * one persistent <Character/> visible across the whole session flow,
 * including the summary screen this mounts into — a second avatar here
 * would just be a redundant duplicate of the exact same synced engine
 * state, not a different one. Reuses XPBar and AnimatedNumber rather
 * than re-implementing stat animation a second time.
 */
function RewardCelebration() {
  const { pet, celebration } = usePet()

  if (!pet || !celebration) return null

  return (
    <AnimatePresence>
      {celebration.visible && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="mx-auto mb-6 w-full max-w-xs rounded-[2rem] border border-white/60 bg-white/50 p-6 text-center backdrop-blur-xl"
        >
          <div className="mt-1">
            <XPBar pet={pet} />
          </div>

          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="text-lg" aria-hidden="true">
              🪙
            </span>
            <AnimatedNumber
              value={pet.coins}
              className="font-display text-lg font-semibold text-ink/80"
            />
            <span className="font-body text-xs text-ink/50">coins</span>
          </div>

          <RewardPanel
            visible={celebration.visible}
            xpGained={celebration.xpGained}
            coinsGained={celebration.coinsGained}
            leveledUp={celebration.leveledUp}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default RewardCelebration
