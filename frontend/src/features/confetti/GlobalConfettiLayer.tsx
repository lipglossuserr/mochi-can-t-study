import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { confettiEvents, type ConfettiBurst } from './confettiEventBus'

interface Particle {
  id: number
  emoji: string
  left: number
  duration: number
  delay: number
  drift: number
  spin: number
  size: number
}

const DEFAULT_COUNT = 24
// Must comfortably exceed the worst-case animation completion time
// (duration up to 3.0s + delay up to 0.6s = 3.6s below) — this used to
// be a smaller 2600ms, which cut a large fraction of particles off
// mid-fall/fade instead of letting them finish naturally, since their
// randomized duration+delay routinely exceeded that window.
const PARTICLE_LIFETIME_MS = 3800

/**
 * GlobalConfettiLayer
 *
 * Mount exactly once, high in the tree (see AppLayout) — every other
 * feature that wants a celebration burst (the Konami code, a streak
 * milestone) just calls `confettiEvents.emit({ emojis: [...] })` from
 * anywhere, including outside React, rather than needing this
 * component threaded through props.
 */
function GlobalConfettiLayer() {
  const [particles, setParticles] = useState<Particle[]>([])
  const idRef = useRef(0)

  useEffect(() => {
    const unsubscribe = confettiEvents.on((burst: ConfettiBurst) => {
      const count = burst.count ?? DEFAULT_COUNT
      const spawned: Particle[] = Array.from({ length: count }, () => ({
        id: idRef.current++,
        emoji: burst.emojis[Math.floor(Math.random() * burst.emojis.length)],
        left: Math.random() * 100,
        duration: 1.8 + Math.random() * 1.2,
        delay: Math.random() * 0.6,
        drift: -60 + Math.random() * 120,
        spin: Math.random() < 0.5 ? 360 : -360,
        size: 18 + Math.random() * 14,
      }))
      setParticles((current) => [...current, ...spawned])
      window.setTimeout(() => {
        setParticles((current) => current.filter((p) => !spawned.some((s) => s.id === p.id)))
      }, PARTICLE_LIFETIME_MS)
    })
    return unsubscribe
  }, [])

  if (particles.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[999] overflow-hidden" aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="confetti-particle absolute top-0"
          style={
            {
              left: `${particle.left}%`,
              fontSize: particle.size,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`,
              '--confetti-drift': `${particle.drift}px`,
              '--confetti-spin': `${particle.spin}deg`,
            } as CSSProperties
          }
        >
          {particle.emoji}
        </span>
      ))}
    </div>
  )
}

export default GlobalConfettiLayer
