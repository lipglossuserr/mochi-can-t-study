import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import Character from './Character'
import HeartParticles from './HeartParticles'
import PetSpeechBubble from '@/features/pet/components/PetSpeechBubble'
import { usePetting } from './usePetting'
import { characterEvents } from '../events/characterEventBus'
import { prefersReducedMotion } from '../utils/reducedMotion'
import { playBoopChirp, playTickleGiggle, playSurprise } from '../utils/petSounds'

interface PettableCharacterProps {
    className?: string
}

interface BoopParticle {
    id: number
    dx: number
    dy: number
    glyph: string
}

/** A tap counts as a "boop" (not a stroke) if the pointer barely moved. */
const TAP_MOVE_THRESHOLD_PX = 6
const BOOP_PARTICLE_COUNT = 7
const BOOP_PARTICLE_LIFETIME_MS = 750
const BOOP_SQUISH_MS = 420
const BOOP_GLYPHS = ['♡', '✦', '♡', '⋆']
const BOOP_LINES = ['Boop! ♡', 'Hehe~', '*purrs*', 'Nyaa~', 'Tehee ♡', 'Eep!', '♡ ♡ ♡']

/** 3+ boops within this window escalate into a tickle instead of a normal boop — see triggerBoop's tickle-tracking ref. */
const TICKLE_TAP_THRESHOLD = 3
const TICKLE_WINDOW_MS = 1600
/** How much bigger the particle burst gets on a tickle vs. a regular boop. */
const TICKLE_PARTICLE_MULTIPLIER = 2.5
const TICKLE_LINES = ['Hehehe, stop— okay don\'t stop ♡', 'Tehehe!', 'Eeeeee!', 'Pfft— hehe!']

/** Two qualifying taps within this window (of each other, not of the whole tickle window) count as a double-tap instead of two separate boops. Tighter than TICKLE_WINDOW_MS on purpose — a deliberate quick double-tap reads differently from a slower "just tapping a few times" pattern. */
const DOUBLE_TAP_WINDOW_MS = 350
const DOUBLE_TAP_PARTICLE_MULTIPLIER = 1.4
const DOUBLE_TAP_LINES = ['!', 'Oh!', 'Hi again ♡', 'Hehe, twice!']

/** Press-and-hold at least this long (without moving past TAP_MOVE_THRESHOLD_PX) counts as a hold instead of a tap — see PettableCharacter's onPointerDownCapture. This is ALSO the tap/boop family's upper duration bound on release (see onPointerUpCapture) — using one shared constant instead of two separate thresholds is a deliberate fix: an earlier version had a smaller, separate TAP_MAX_DURATION_MS (450ms) here, creating a real dead zone between it and this constant where releasing after, say, 500ms produced no reaction at all (too long for a tap, too short for the long-press timer to have fired yet). Anything released before this timer fires is, by definition, not a hold, so it should always qualify as a tap-family gesture provided movement stayed low. */
const LONG_PRESS_MS = 650

/**
 * <PettableCharacter/> — Character plus touchability.
 *
 * Two distinct gestures, so both a slow "aww" moment and a quick
 * "hi!" tap feel intentional rather than the same thing twice:
 *
 *  - Stroking (mouse/touch drag, see usePetting) emits `user-petted`
 *    and floats hearts from under the moving pointer — unchanged.
 *  - A quick tap/click ("boop") — pointer barely moved and didn't
 *    linger — plays a snappy squish animation, a synthesized chirp
 *    (see petSounds.ts), scatters a burst of hearts/sparkles outward
 *    from the tap point, pops a one-line speech bubble, and (being
 *    affection too) reuses the same `user-petted` event so the
 *    engine's mood/bond logic sees it.
 *  - Three-plus boops within TICKLE_WINDOW_MS escalate into a tickle:
 *    a giggle sound, a noticeably bigger particle burst, a sillier
 *    speech line, and the engine's full celebrate() sequence via the
 *    `user-tickled` event — a bigger, funnier reaction than a single
 *    boop, without needing its own separate gesture to discover.
 *  - Exactly two taps within the tighter DOUBLE_TAP_WINDOW_MS (not the
 *    slower general tickle window) land as a distinct "!" surprise
 *    beat instead of two separate boops — the escalation reads as
 *    1 tap = boop, 2 fast taps = surprise, 3+ = tickle.
 *  - Press-and-hold without moving past TAP_MOVE_THRESHOLD_PX, held
 *    longer than LONG_PRESS_MS, reads as a calm, continuous "hold"
 *    rather than a poke — a distinct, quieter reaction (`user-held`)
 *    from either of the above.
 *
 * Boop detection lives here rather than in usePetting because
 * usePetting's stroke gesture is deliberately tap-inert by design —
 * this is an additive layer on top, not a change to that contract.
 */
function PettableCharacter({ className }: PettableCharacterProps) {
    const { particles, isPetting, handlers } = usePetting()

    const [boopParticles, setBoopParticles] = useState<BoopParticle[]>([])
    const [boopLine, setBoopLine] = useState<string | null>(null)
    /** How long the shared bubble stays up — 900ms for a short "Boop!"-style line; a longer message (e.g. a random fun-fact easter egg line) can pass a bigger value if one ever needs it. */
    const [speechAutoHideMs, setSpeechAutoHideMs] = useState(900)
    const [isBooping, setIsBooping] = useState(false)

    const tapStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
    const boopIdRef = useRef(0)
    const squishTimeoutRef = useRef<number | null>(null)
    const particleTimeoutsRef = useRef<number[]>([])
    /** Recent boop timestamps, pruned to TICKLE_WINDOW_MS on every tap — once TICKLE_TAP_THRESHOLD taps land inside that window, the next boop escalates into a tickle instead. */
    const recentBoopTimesRef = useRef<number[]>([])
    /** Timer for the long-press gesture, and whether it already fired this pointer-down session (so pointerUp knows to skip the normal tap logic). */
    const longPressTimeoutRef = useRef<number | null>(null)
    const longPressFiredRef = useRef(false)

    useEffect(
        () => () => {
            if (squishTimeoutRef.current) window.clearTimeout(squishTimeoutRef.current)
            if (longPressTimeoutRef.current) window.clearTimeout(longPressTimeoutRef.current)
            particleTimeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout))
        },
        [],
    )

    const spawnBoopBurst = useCallback((intensity = 1) => {
        if (prefersReducedMotion()) return
        const count = Math.round(BOOP_PARTICLE_COUNT * intensity)
        const burst: BoopParticle[] = Array.from({ length: count }, () => {
            const angle = Math.random() * Math.PI * 2
            const distance = (28 + Math.random() * 24) * Math.min(intensity, 1.6) // capped so a tickle's particles fly further, not absurdly far
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

    const triggerHold = useCallback(() => {
        characterEvents.emit({ type: 'user-held' })
        setBoopLine(null) // content-petted's thought comes from the engine's own showThought, not this component's bubble — see CharacterEngine's 'user-held' handler
    }, [])

    const triggerBoop = useCallback(() => {
        const now = performance.now()
        const previousTapTime = recentBoopTimesRef.current[recentBoopTimesRef.current.length - 1] ?? null
        recentBoopTimesRef.current = [...recentBoopTimesRef.current, now].filter(
            (t) => now - t <= TICKLE_WINDOW_MS,
        )
        const tapCount = recentBoopTimesRef.current.length
        const isTickle = tapCount >= TICKLE_TAP_THRESHOLD
        const isDoubleTap =
            !isTickle && tapCount === 2 && previousTapTime !== null && now - previousTapTime <= DOUBLE_TAP_WINDOW_MS

        if (isTickle) {
            // A tickle is still affection underneath — CharacterEngine's
            // 'user-tickled' handler calls the same celebrate() sequence
            // a completed session triggers, layered with its own thought
            // line (see that handler). Reset the tracker afterward so the
            // NEXT run of taps needs to build back up to a second tickle
            // rather than every tap re-triggering it while still flush
            // with recent taps.
            recentBoopTimesRef.current = []
            characterEvents.emit({ type: 'user-tickled' })
            playTickleGiggle()
            spawnBoopBurst(TICKLE_PARTICLE_MULTIPLIER)
            setBoopLine(TICKLE_LINES[Math.floor(Math.random() * TICKLE_LINES.length)])
            setSpeechAutoHideMs(900)
        } else if (isDoubleTap) {
            // Deliberately does NOT reset recentBoopTimesRef here (unlike
            // the tickle branch above) — this was a real bug during
            // development: resetting on every double-tap meant genuine
            // rapid mashing (every tap under DOUBLE_TAP_WINDOW_MS apart)
            // could never accumulate past 2 taps, perpetually alternating
            // boop/double-tap and never reaching TICKLE_TAP_THRESHOLD.
            // Leaving the array intact lets a 3rd fast tap correctly
            // escalate into a tickle, while a double-tap that's the
            // LAST tap in a sequence (no 3rd tap follows) still gets its
            // own distinct reaction here, since this branch still runs
            // on exactly 2 taps regardless of what comes after.
            characterEvents.emit({ type: 'user-double-tapped' })
            playSurprise()
            spawnBoopBurst(DOUBLE_TAP_PARTICLE_MULTIPLIER)
            setBoopLine(DOUBLE_TAP_LINES[Math.floor(Math.random() * DOUBLE_TAP_LINES.length)])
            setSpeechAutoHideMs(900)
        } else {
            // A boop is a light, quick form of affection — the engine's
            // pet() action already handles mood/bond bumps and cooldowns,
            // so reuse the same event stroking emits rather than adding a
            // parallel path.
            characterEvents.emit({ type: 'user-petted' })
            playBoopChirp()
            spawnBoopBurst()
            setBoopLine(BOOP_LINES[Math.floor(Math.random() * BOOP_LINES.length)])
            setSpeechAutoHideMs(900)
        }

        if (!prefersReducedMotion()) {
            setIsBooping(true)
            if (squishTimeoutRef.current) window.clearTimeout(squishTimeoutRef.current)
            squishTimeoutRef.current = window.setTimeout(() => setIsBooping(false), BOOP_SQUISH_MS)
        }
    }, [spawnBoopBurst])

    const onPointerDownCapture = useCallback((event: ReactPointerEvent<HTMLElement>) => {
        tapStartRef.current = { x: event.clientX, y: event.clientY, time: performance.now() }
        longPressFiredRef.current = false
        if (longPressTimeoutRef.current) window.clearTimeout(longPressTimeoutRef.current)
        longPressTimeoutRef.current = window.setTimeout(() => {
            // Still down (tapStartRef only clears on pointerUp/cancel) and
            // never cancelled by too much movement (see onPointerMoveCapture)
            // — a genuine hold, not a tap that just happens to be slow.
            if (!tapStartRef.current) return
            longPressFiredRef.current = true
            triggerHold()
        }, LONG_PRESS_MS)
    }, [triggerHold])

    const onPointerMoveCapture = useCallback((event: ReactPointerEvent<HTMLElement>) => {
        const start = tapStartRef.current
        if (!start || longPressFiredRef.current) return
        const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y)
        if (moved > TAP_MOVE_THRESHOLD_PX && longPressTimeoutRef.current) {
            // Moved enough that this reads as a stroke starting, not a
            // hold — cancel the pending long-press so it doesn't fire
            // mid-stroke.
            window.clearTimeout(longPressTimeoutRef.current)
            longPressTimeoutRef.current = null
        }
    }, [])

    const onPointerUpCapture = useCallback(
        (event: ReactPointerEvent<HTMLElement>) => {
            if (longPressTimeoutRef.current) {
                window.clearTimeout(longPressTimeoutRef.current)
                longPressTimeoutRef.current = null
            }
            const start = tapStartRef.current
            tapStartRef.current = null
            // The long-press already fired its own reaction while this
            // pointer was still down — don't also evaluate it as a tap
            // on release.
            if (longPressFiredRef.current) return
            if (!start) return

            const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y)
            const elapsed = performance.now() - start.time
            if (moved <= TAP_MOVE_THRESHOLD_PX && elapsed < LONG_PRESS_MS) {
                triggerBoop()
            }
        },
        [triggerBoop],
    )

    return (
        <div
            {...handlers}
            onPointerDownCapture={onPointerDownCapture}
            onPointerMoveCapture={onPointerMoveCapture}
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

            <PetSpeechBubble message={boopLine} autoHideMs={speechAutoHideMs} className="-top-2 -right-1 sm:-right-3" />
        </div>
    )
}

export default PettableCharacter
