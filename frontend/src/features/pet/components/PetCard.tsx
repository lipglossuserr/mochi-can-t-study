import { motion } from 'framer-motion'
import RivePet from './RivePet'
import PetSpeechBubble from './PetSpeechBubble'
import { usePet } from '../hooks/usePet'
import type { Pet, PetState } from '../types/pet'

interface PetCardProps {
  pet: Pick<Pet, 'name' | 'stage' | 'state'>
}

const STATE_CAPTION: Record<PetState, string> = {
  IDLE: 'is relaxing ♡',
  STUDYING: 'is focusing with you ✎',
  CELEBRATING: 'is celebrating! ✦',
  HAPPY: 'is delighted! ♡',
}

/**
 * PetCard
 *
 * The visual centerpiece of the dashboard. Wraps RivePet in the same
 * frosted, rounded card language as the rest of the app, with Mochi's
 * name, growth stage, a small caption describing what they're up to,
 * and a speech bubble for Feed/Play reactions.
 *
 * Renders `visualState` from PetContext rather than `pet.state`
 * directly — that's what lets Feed/Play briefly show Mochi as HAPPY
 * without needing the backend to know about that state at all.
 */
function PetCard({ pet }: PetCardProps) {
  const { visualState, speech } = usePet()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="rounded-[2.5rem] border border-white/50 bg-white/45 p-8 text-center shadow-[0_20px_60px_-15px_rgba(224,112,158,0.4)] backdrop-blur-xl sm:p-10"
    >
      <p className="font-display text-xs font-semibold uppercase tracking-widest text-taro/80">
        {pet.stage} stage
      </p>

      <div className="relative mx-auto mt-4 h-48 w-48 sm:h-56 sm:w-56">
        <PetSpeechBubble message={speech} className="-top-3 left-1/2 -translate-x-1/2" />
        <RivePet state={visualState} />
      </div>

      <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
        {pet.name}
      </h2>
      <p className="mt-1 font-body text-sm text-ink/60">
        {STATE_CAPTION[visualState]}
      </p>
    </motion.div>
  )
}

export default PetCard
