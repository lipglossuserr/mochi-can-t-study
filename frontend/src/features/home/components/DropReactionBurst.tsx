import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { prefersReducedMotion } from '@/features/character/utils/reducedMotion'

interface BurstParticle {
    id: number
    dx: number
    dy: number
    glyph: string
}

interface DropReactionBurstProps {
    /** Increment this to fire a new burst — 0 (or unchanged) renders nothing. Same "bump a counter to retrigger" convention as celebration timers elsewhere in this codebase. */
    trigger: number
    className?: string
}

const PARTICLE_COUNT = 7
const PARTICLE_LIFETIME_MS = 750
const GLYPHS = ['♡', '✦', '♡', '⋆']

/**
 * DropReactionBurst — the exact same particle burst PettableCharacter
 * spawns on a boop tap (`.boop-particle` / `boop-particle-burst`
 * keyframe in globals.css), pulled out standalone so a successful
 * drag-and-drop feed/play can reuse it too — see the plan's own framing:
 * "reuse the boop-style squish + particle burst... no new animation
 * vocabulary needed." Pair with the `character-boop` class (applied to
 * PettableCharacter's own `className` prop) for the matching squish.
 */
function DropReactionBurst({ trigger, className }: DropReactionBurstProps) {
    const [particles, setParticles] = useState<BurstParticle[]>([])
    const idRef = useRef(0)
    const timeoutsRef = useRef<number[]>([])
    const isFirstRenderRef = useRef(true)

    useEffect(
        () => () => {
            timeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout))
        },
        [],
    )

    useEffect(() => {
        // Don't fire on mount just because `trigger` starts at some initial value.
        if (isFirstRenderRef.current) {
            isFirstRenderRef.current = false
            return
        }
        if (trigger === 0 || prefersReducedMotion()) return

        const burst: BurstParticle[] = Array.from({ length: PARTICLE_COUNT }, () => {
            const angle = Math.random() * Math.PI * 2
            const distance = 28 + Math.random() * 24
            return {
                id: idRef.current++,
                dx: Math.cos(angle) * distance,
                dy: Math.sin(angle) * distance,
                glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
            }
        })
        setParticles((current) => [...current, ...burst])
        const timeout = window.setTimeout(() => {
            setParticles((current) => current.filter((p) => !burst.some((b) => b.id === p.id)))
        }, PARTICLE_LIFETIME_MS)
        timeoutsRef.current.push(timeout)
        // eslint-disable-next-line react-hooks/exhaustive-deps -- fires only on `trigger` changing, not on every render
    }, [trigger])

    if (particles.length === 0) return null

    return (
        <div className={`pointer-events-none absolute inset-0 z-20 ${className ?? ''}`} aria-hidden="true">
            {particles.map((particle) => (
                <span
                    key={particle.id}
                    className="boop-particle absolute left-1/2 top-1/2 select-none text-base text-taro"
                    style={
                        {
                            '--boop-dx': `${particle.dx}px`,
                            '--boop-dy': `${particle.dy}px`,
                        } as CSSProperties
                    }
                >
                    {particle.glyph}
                </span>
            ))}
        </div>
    )
}

export default DropReactionBurst
