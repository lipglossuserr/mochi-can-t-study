import { useKonamiCode } from '@/hooks/useKonamiCode'
import { characterEvents } from '@/features/character'
import { confettiEvents } from './confettiEventBus'

const KONAMI_EMOJIS = ['🎉', '✨', '🌈', '⭐', '🍡']

/** Renders nothing — purely a global keyboard listener. Mount once, alongside GlobalConfettiLayer (see AppLayout). */
function KonamiEasterEgg() {
  useKonamiCode(() => {
    confettiEvents.emit({ emojis: KONAMI_EMOJIS, count: 36 })
    characterEvents.emit({ type: 'konami-unlocked' })
  })
  return null
}

export default KonamiEasterEgg
