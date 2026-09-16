import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Character from '@/features/character/react/Character'
import { usePet } from '../hooks/usePet'

/**
 * GlobalPetLayer
 *
 * The "Global Pet Layer" from the app shell: a small persistent Mochi
 * companion that follows the person from room to room, reinforcing
 * that Mochi — not any one screen — is the center of the app.
 * Reuses Character and PetContext as-is; no extra fetching, no new state.
 * Hidden on the Study Room too, now that it has its own persistent,
 * larger companion (see StudyRoomPage.tsx).
 */
function GlobalPetLayer() {
  const { pet, visualState } = usePet()
  const location = useLocation()

  const hidden = !pet || location.pathname.startsWith('/home') || location.pathname.startsWith('/study')

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 12 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-20 right-4 z-30 lg:bottom-6 lg:right-6"
        >
          <Link
            to="/home"
            aria-label={`Go to Home — Mochi is ${visualState.toLowerCase()}`}
            className="flex h-16 w-16 items-center justify-center rounded-full border border-white/60 bg-white/80 p-1.5 shadow-[0_12px_30px_-10px_rgba(224,112,158,0.55)] backdrop-blur-xl transition-transform hover:scale-105"
          >
            {pet && <Character />}
          </Link>
          {pet && (
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-taro font-body text-[10px] font-bold text-white shadow">
              {pet.level}
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default GlobalPetLayer
