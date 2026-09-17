import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { characterEvents } from '../events/characterEventBus'
import { prefersReducedMotion } from '../utils/reducedMotion'
import { playBoopChirp } from '../utils/petSounds'

export interface PetParticle {
    id: number
    /** Percent coordinates within the petted container. */
    x: number
    y: number
    glyph: string
}

/** Stroke distance (px) that counts as one "pet" after the first. */
const STROKE_THRESHOLD_PX = 55
/**
 * Sprint 6.7: the very first stroke of a gesture used to need the same
 * full 55px drag as every subsequent one, which read as unresponsive —
 * nothing happened for a noticeable beat after touching Mochi. A
 * shorter threshold only for a stroke's first emit gets the reaction
 * (heart particle + `user-petted` event) started almost immediately,
 * while later emits in the same stroke still use the full threshold so
 * a long, slow drag doesn't spam events any more than it used to.
 */
const FIRST_STROKE_THRESHOLD_PX = 18
/** Minimum gap between emitted pets, so holding still doesn't spam. */
const EMIT_COOLDOWN_MS = 300
const PARTICLE_LIFETIME_MS = 1200
const MAX_PARTICLES = 10
const GLYPHS = ['♡', '♡', '✦']

/**
 * usePetting — turns pointer strokes (mouse drag OR touch) over an
 * element into `user-petted` character events plus a small stream of
 * heart/sparkle particles.
 *
 * The gesture model is deliberately stroke-based: taps do nothing;
 * moving the pointer across Mochi like you'd actually stroke a cat is
 * what registers. Rewarding, not excessive — emits are distance-gated
 * AND cooldown-gated, particles are capped, and under
 * prefers-reduced-motion particles are skipped entirely (the engine
 * still reacts, so the interaction stays functional).
 */
export function usePetting() {
    const [particles, setParticles] = useState<PetParticle[]>([])
    const [isPetting, setIsPetting] = useState(false)

    const strokingRef = useRef(false)
    const lastPointRef = useRef<{ x: number; y: number } | null>(null)
    const distanceRef = useRef(0)
    const lastEmitRef = useRef(0)
    const hasEmittedThisStrokeRef = useRef(false)
    const idRef = useRef(0)
    const timeoutsRef = useRef<number[]>([])

    useEffect(
        () => () => {
            timeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout))
        },
        [],
    )

    const spawnParticle = useCallback((xPercent: number, yPercent: number) => {
        if (prefersReducedMotion()) return
        const particle: PetParticle = {
            id: idRef.current++,
            x: xPercent,
            y: yPercent,
            glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        }
        setParticles((current) => [...current.slice(-(MAX_PARTICLES - 1)), particle])
        timeoutsRef.current.push(
            window.setTimeout(() => {
                setParticles((current) => current.filter((existing) => existing.id !== particle.id))
            }, PARTICLE_LIFETIME_MS),
        )
    }, [])

    const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
        strokingRef.current = true
        setIsPetting(true)
        lastPointRef.current = { x: event.clientX, y: event.clientY }
        distanceRef.current = 0
        hasEmittedThisStrokeRef.current = false
        // Keep receiving moves even if the pointer wanders off the element.
        event.currentTarget.setPointerCapture?.(event.pointerId)
    }, [])

    const onPointerMove = useCallback(
        (event: ReactPointerEvent<HTMLElement>) => {
            if (!strokingRef.current || !lastPointRef.current) return

            const dx = event.clientX - lastPointRef.current.x
            const dy = event.clientY - lastPointRef.current.y
            lastPointRef.current = { x: event.clientX, y: event.clientY }
            distanceRef.current += Math.hypot(dx, dy)

            const threshold = hasEmittedThisStrokeRef.current
                ? STROKE_THRESHOLD_PX
                : FIRST_STROKE_THRESHOLD_PX
            const now = performance.now()
            if (distanceRef.current >= threshold && now - lastEmitRef.current >= EMIT_COOLDOWN_MS) {
                distanceRef.current = 0
                lastEmitRef.current = now
                hasEmittedThisStrokeRef.current = true
                characterEvents.emit({ type: 'user-petted' })
                // Fixes a loose end: tapping (PettableCharacter's boop)
                // already had sound feedback, but stroking never did —
                // same chirp as a boop, reused rather than adding a new
                // synthesized sound just for this. EMIT_COOLDOWN_MS
                // above already rate-limits this to at most ~3/sec, so
                // a long stroke reads as a soft rhythmic purr rather
                // than spamming the same chirp continuously.
                playBoopChirp()

                const rect = event.currentTarget.getBoundingClientRect()
                spawnParticle(
                    ((event.clientX - rect.left) / rect.width) * 100,
                    ((event.clientY - rect.top) / rect.height) * 100,
                )
            }
        },
        [spawnParticle],
    )

    const endStroke = useCallback(() => {
        strokingRef.current = false
        setIsPetting(false)
        lastPointRef.current = null
        distanceRef.current = 0
        hasEmittedThisStrokeRef.current = false
    }, [])

    return {
        particles,
        isPetting,
        handlers: {
            onPointerDown,
            onPointerMove,
            onPointerUp: endStroke,
            onPointerLeave: endStroke,
            onPointerCancel: endStroke,
        },
    }
}