import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import Character from './Character'
import HeartParticles from './HeartParticles'
import PetSpeechBubble from '@/features/pet/components/PetSpeechBubble'
import { usePetting } from './usePetting'
import { characterEvents } from '../events/characterEventBus'
import { prefersReducedMotion } from '../utils/reducedMotion'

interface PettableCharacterProps {
    className?: string
}

interface BoopParticle {
    id: number
    dx: number
    dy: number
    glyph: string
}

/** A tap counts as a "boop" (not a stroke) if the pointer barely moved and didn't linger. */
const TAP_MOVE_THRESHOLD_PX = 6
const TAP_MAX_DURATION_MS = 450
const BOOP_PARTICLE_COUNT = 7
const BOOP_PARTICLE_LIFETIME_MS = 750
const BOOP_SQUISH_MS = 420
const BOOP_GLYPHS = ['♡', '✦', '♡', '⋆']
const BOOP_LINES = ['Boop! ♡', 'Hehe~', '*purrs*', 'Nyaa~', 'Tehee ♡', 'Eep!', '♡ ♡ ♡']

/**
 * <PettableCharacter/> — Character plus touchability.
 *
 * Two distinct gestures, so both a slow "aww" moment and a quick
 * "hi!" tap feel intentional rather than the same thing twice:
 *
 *  - Stroking (mouse/touch drag, see usePetting) emits `user-petted`
 *    and floats hearts from under the moving pointer — unchanged.
 *  - A quick tap/click ("boop") — pointer barely moved and didn't
 *    linger — plays a snappy squish animation, scatters a burst of
 *    hearts/sparkles outward from the tap point, pops a one-line
 *    speech bubble, and (being affection too) reuses the same
 *    `user-petted` event so the engine's mood/bond logic sees it.
 *
 * Boop detection lives here rather than in usePetting because
 * usePetting's stroke gesture is deliberately tap-inert by design —
 * this is an additive layer on top, not a change to that contract.
 */
function PettableCharacter({ className }: PettableCharacterProps) {
    const { particles, isPetting, handlers } = usePetting()

    const [boopParticles, setBoopParticles] = useState<BoopParticle[]>([])
    const [boopLine, setBoopLine] = useState<string | null>(null)
    const [isBooping, setIsBooping] = useState(false)

    const tapStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
    const boopIdRef = useRef(0)
    const squishTimeoutRef = useRef<number | null>(null)
    const particleTimeoutsRef = useRef<number[]>([])

    useEffect(
        () => () => {
            if (squishTimeoutRef.current) window.clearTimeout(squishTimeoutRef.current)
            particleTimeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout))
        },
        [],
    )

    const spawnBoopBurst = useCallback(() => {
        if (prefersReducedMotion()) return
        const burst: BoopParticle[] = Array.from({ length: BOOP_PARTICLE_COUNT }, () => {
            const angle = Math.random() * Math.PI * 2
            const distance = 28 + Math.random() * 24
            return {
                id: boopIdRef.current++,
                dx: Math.cos(angle) * distance,
                dy: Math.sin(angle) * distance,
                glyph: BOOP_GLYPHS[Math.floor(Math.random() * BOOP_GLYPHS.length)],
            }
        })
        setBoopParticles((current) => [...current, ...burst])
        const timeout = window.setTimeout(() => {
            setBoopParticles((current) => current.filter((p) => !burst.some((b) => b.id === p.id)))
        }, BOOP_PARTICLE_LIFETIME_MS)
        particleTimeoutsRef.current.push(timeout)
    }, [])

    const triggerBoop = useCallback(() => {
        // A boop is a light, quick form of affection — the engine's
        // pet() action already handles mood/bond bumps and cooldowns,
        // so reuse the same event stroking emits rather than adding a
        // parallel path.
        characterEvents.emit({ type: 'user-petted' })
        spawnBoopBurst()
        setBoopLine(BOOP_LINES[Math.floor(Math.random() * BOOP_LINES.length)])

        if (!prefersReducedMotion()) {
            setIsBooping(true)
            if (squishTimeoutRef.current) window.clearTimeout(squishTimeoutRef.current)
            squishTimeoutRef.current = window.setTimeout(() => setIsBooping(false), BOOP_SQUISH_MS)
        }
    }, [spawnBoopBurst])

    const onPointerDownCapture = useCallback((event: ReactPointerEvent<HTMLElement>) => {
        tapStartRef.current = { x: event.clientX, y: event.clientY, time: performance.now() }
    }, [])

    const onPointerUpCapture = useCallback(
        (event: ReactPointerEvent<HTMLElement>) => {
            const start = tapStartRef.current
            tapStartRef.current = null
            if (!start) return

            const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y)
            const elapsed = performance.now() - start.time
            if (moved <= TAP_MOVE_THRESHOLD_PX && elapsed <= TAP_MAX_DURATION_MS) {
                triggerBoop()
            }
        },
        [triggerBoop],
    )

    return (
        <div
            {...handlers}
            onPointerDownCapture={onPointerDownCapture}
            onPointerUpCapture={onPointerUpCapture}
            className={`relative touch-none select-none ${isPetting ? 'cursor-grabbing' : 'cursor-grab'} ${isBooping ? 'character-boop' : ''} ${className ?? 'h-full w-full'}`}
            role="button"
            tabIndex={0}
            aria-label="Pet Mochi by stroking, or tap her to say hello"
        >
            <Character />
            <HeartParticles particles={particles} />

            {boopParticles.length > 0 && (
                <div className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
                    {boopParticles.map((particle) => (
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
            )}

            <PetSpeechBubble message={boopLine} autoHideMs={900} className="-top-2 -right-1 sm:-right-3" />
        </div>
    )
}

export default PettableCharacter
