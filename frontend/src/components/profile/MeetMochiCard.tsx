import { motion } from 'framer-motion'
import PettableCharacter from '@/features/character/react/PettableCharacter'
import PetStats from '@/features/pet/components/PetStats'
import PetActions from '@/features/pet/components/PetActions'
import PetSpeechBubble from '@/features/pet/components/PetSpeechBubble'
import { usePet } from '@/features/pet/hooks/usePet'
import type { Pet, PetState } from '@/features/pet/types/pet'

interface MeetMochiCardProps {
  pet: Pet
}

const STATE_CAPTION: Record<PetState, string> = {
  IDLE: 'is relaxing here with you ♡',
  STUDYING: 'is focusing right alongside you ✎',
  CELEBRATING: 'is celebrating your progress! ✦',
  HAPPY: 'is delighted to see you! ♡',
}

/**
 * MeetMochiCard
 *
 * The Profile page's own "meet Mochi" moment — the same touchable
 * character as Home (stroke to pet, tap to boop, full particle/speech
 * reactions), plus her mood/hunger/bond bars and the Feed/Play actions,
 * all in one place. Feed/Play and the pettable character both go
 * through the shared PetContext, so anything done here is reflected
 * instantly on Home, the global pet bubble, and the stats above.
 */
function MeetMochiCard({ pet }: MeetMochiCardProps) {
  const { feed, play, isFeeding, isPlaying, visualState, speech } = usePet()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="rounded-[2.5rem] border border-white/50 bg-white/45 p-6 shadow-[0_20px_60px_-15px_rgba(224,112,158,0.4)] backdrop-blur-xl sm:p-8"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">🍡 Meet Mochi</h2>
        <span className="font-body text-xs font-semibold uppercase tracking-widest text-taro/70">
          {pet.stage} stage
        </span>
      </div>

      <div className="relative mx-auto mt-4 h-40 w-40 sm:h-48 sm:w-48">
        <PetSpeechBubble message={speech} className="-top-3 left-1/2 -translate-x-1/2" />
        <PettableCharacter />
      </div>

      <p className="mt-3 text-center font-display text-lg font-semibold text-ink">{pet.name}</p>
      <p className="text-center font-body text-sm text-ink/60">{STATE_CAPTION[visualState]}</p>
      <p className="mt-1 text-center font-body text-xs text-ink/40">
        Stroke her to pet, or give her a quick tap to say hi ♡
      </p>

      <div className="mt-6">
        <PetStats pet={pet} />
      </div>

      <div className="mt-4">
        <PetActions onFeed={feed} onPlay={play} isFeeding={isFeeding} isPlaying={isPlaying} />
      </div>
    </motion.div>
  )
}

export default MeetMochiCard
