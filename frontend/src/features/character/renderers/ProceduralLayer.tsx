import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useCharacterEngine } from '../react/CharacterProvider'
import { prefersReducedMotion } from '../utils/reducedMotion'
import type { MovementSnapshot, ObjectAwarenessSnapshot, RoomPresenceSnapshot } from '../types'
import type { GazeTarget } from '../gaze/GazeController'
import type { EmotionCue } from './StateToClipMap'
import type { ParticleDirective } from './composition/types'

/**
 * ProceduralLayer — Sprint 6.6.
 *
 * Library choice: Motion (the `framer-motion` package already in
 * package.json, actively used by LivingMochiRenderer). Not anime.js:
 * anime.js is imperative and fights React's lifecycle, and adding it
 * would be a second animation dependency in a codebase that already
 * has one. Motion gives declarative mount/unmount cross-fades
 * (AnimatePresence — reused by TransitionCompositor) and real spring
 * physics out of the box, which is exactly what "soft settle, not a
 * snap" for head/eye tracking needs.
 *
 * Every micro-animation below is independent and always safe to run;
 * each subscribes only to signals the engine already emits (gaze,
 * object-awareness anchor, movement, room presence). None of them
 * decide WHEN Mochi is happy/sleepy/walking — that's upstream.
 *
 * "Breathing-intensity" and a discrete emotional-body-language enum,
 * as named in this sprint's brief, don't exist as literal engine
 * fields in this codebase. The closest already-emitted proxies are
 * used instead and documented at each call site below, rather than
 * computing a new signal here.
 */

const EMOTION_COLOR: Record<EmotionCue, string> = {
    happy: '#ffb347',
    curious: '#7dd3fc',
    sleepy: '#c4b5fd',
    calm: '#86efac',
    neutral: 'transparent',
}

export interface ProceduralLayerProps {
    emotion: EmotionCue
    eyesClosed: boolean
    isIdleLike: boolean
    /**
     * Sprint 6.7A: state-driven particle/effect directives (see
     * composition/types.ts for the full rationale). Was a single
     * `fakeCelebrate: boolean` prop; a second directive is now "read a
     * different id out of this array," not "add a new boolean prop and
     * thread it through every call site between here and
     * CombinedCharacterRenderer."
     */
    particles: ParticleDirective[]
    /**
     * Sprint 6.7A-3: true while `state === 'studying'` — drives a subtle,
     * distinct breathing/posture nuance (calmer cadence, a faint settled
     * lean) instead of reusing generic idle sway, which stays off during
     * studying (`isIdleLike` is false for it) since restless-looking
     * idle sway would read as inattentive over a desk.
     */
    isStudying: boolean
    movement: MovementSnapshot
    objectAwareness: ObjectAwarenessSnapshot
    presence: RoomPresenceSnapshot
}

/** Rough onscreen offsets (normalized -1..1) for each named room anchor's look direction. */
const ANCHOR_LOOK_TARGET: Record<string, { x: number; y: number }> = {
    window: { x: -0.6, y: -0.5 },
    desk: { x: 0.3, y: 0.2 },
    cushion: { x: 0, y: 0.55 },
    bookshelf: { x: 0.7, y: -0.3 },
    plant: { x: -0.4, y: 0.4 },
}

export default function ProceduralLayer({
    emotion,
    eyesClosed,
    isIdleLike,
    particles,
    isStudying,
    movement,
    objectAwareness,
    presence,
}: ProceduralLayerProps) {
    const engine = useCharacterEngine()
    const reducedMotion = prefersReducedMotion()
    const fakeCelebrate = particles.some((p) => p.id === 'fake-celebrate-bounce' && p.active)

    // ── Head/eye look-tracking ────────────────────────────────────────
    // Priority: a scripted "desk interaction" glance (Sprint 6.7A-4 —
    // engine.glance, e.g. "look at the notebook") wins when present;
    // then cursor-interest-point (engine.gaze, Sprint 5.5's imperative
    // channel); Object Awareness's current anchor is the final fallback.
    // `glance` is deliberately a separate channel from `gaze` rather than
    // a temporary override written into it — `useCursorAwareness` writes
    // to `gaze` on nearly every pointermove, which would otherwise
    // clobber a scripted glance within a frame or two of it starting.
    // Motion's spring gives the "soft settle" the brief asks for — no
    // manual rAF lerp loop needed.
    const lookX = useMotionValue(0)
    const lookY = useMotionValue(0)
    const springX = useSpring(lookX, { stiffness: 90, damping: 16, mass: 0.7 })
    const springY = useSpring(lookY, { stiffness: 90, damping: 16, mass: 0.7 })
    const nudgeX = useTransform(springX, (v) => v * 4) // px, within the 2–5px range the brief specifies
    const nudgeY = useTransform(springY, (v) => v * 4)

    useEffect(() => {
        if (reducedMotion || eyesClosed) {
            lookX.set(0)
            lookY.set(0)
            return
        }

        let latestGlance: GazeTarget | null = null
        let latestGaze: GazeTarget | null = null

        const apply = () => {
            const anchorTarget = objectAwareness.currentAnchor
                ? ANCHOR_LOOK_TARGET[objectAwareness.currentAnchor]
                : null
            const target = latestGlance ?? latestGaze ?? anchorTarget
            lookX.set(target?.x ?? 0)
            lookY.set(target?.y ?? 0)
        }

        const unsubGlance = engine.glance.subscribe((target) => {
            latestGlance = target
            apply()
        })
        const unsubGaze = engine.gaze.subscribe((target) => {
            latestGaze = target
            apply()
        })
        return () => {
            unsubGlance()
            unsubGaze()
        }
    }, [engine, objectAwareness.currentAnchor, reducedMotion, eyesClosed, lookX, lookY])

    // ── Blink ──────────────────────────────────────────────────────────
    // Replaces the non-functional Rive Blink. Randomized 2–6s interval,
    // occasional double-blink. Held shut (no scheduling) while eyesClosed.
    const [blinkClosed, setBlinkClosed] = useState(false)
    useEffect(() => {
        if (reducedMotion || eyesClosed) return
        let cancelled = false
        let timer: ReturnType<typeof setTimeout>

        const doBlink = (andThen: () => void) => {
            setBlinkClosed(true)
            setTimeout(() => {
                if (cancelled) return
                setBlinkClosed(false)
                andThen()
            }, 120)
        }

        const schedule = () => {
            const delay = 2000 + Math.random() * 4000
            timer = setTimeout(() => {
                if (cancelled) return
                const doubleBlink = Math.random() < 0.15
                doBlink(() => {
                    if (doubleBlink) {
                        setTimeout(() => doBlink(schedule), 160)
                    } else {
                        schedule()
                    }
                })
            }, delay)
        }
        schedule()
        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [reducedMotion, eyesClosed])

    const eyesShut = eyesClosed || blinkClosed

    // ── Breathing variation ───────────────────────────────────────────
    // The brief names a dedicated "Emotional Body Language breathing-
    // intensity signal" (Sprint 6.5) that doesn't exist as a literal
    // field in this codebase. RoomPresenceSnapshot (activityLevel,
    // comfort — Sprint 5.4/5.x, already emitted every snapshot) is the
    // closest real proxy for "how lively/settled Mochi is right now,"
    // so amplitude/speed are driven from that instead of computed here.
    const breathAmplitude = (0.012 + presence.activityLevel * 0.012) * (isStudying ? 0.75 : 1)
    // Sprint 6.7A-3: calmer, slightly slower cadence while studying —
    // "focused stillness" rather than a generic idle breathing rate.
    const breathDuration = (3.2 - presence.comfort * 0.8) * (isStudying ? 1.15 : 1)

    // ── Idle micro-variety ─────────────────────────────────────────────
    // A fresh multiplier picked once per mount so the same sway never
    // plays back identically twice — timing/shape untouched, only
    // amplitude breathes a little, matching the variance pattern
    // LivingMochiRenderer already established elsewhere in this codebase.
    const idleVariance = useRef(0.85 + Math.random() * 0.3).current

    // ── Fake Walk ──────────────────────────────────────────────────────
    // Position itself is already handled upstream by <Character/>, which
    // translates the whole element from Navigation's real interpolated
    // position — this only adds the bob/tilt that suggests a walk cycle
    // and speeds up the idle-ish sway slightly while moving, per the brief.
    const walking = movement.state === 'walking' && !reducedMotion
    const walkTilt = walking ? (movement.direction === 'left' ? -3 : 3) : 0

    return (
        <div
            aria-hidden
            style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                overflow: 'visible',
            }}
        >
            {/* Breathing + idle sway + walk bob/tilt — one transform stack on the whole artboard container. */}
            <motion.div
                style={{ position: 'absolute', inset: 0, x: nudgeX, y: nudgeY }}
                animate={
                    reducedMotion
                        ? undefined
                        : {
                              scaleY: [1, 1 + breathAmplitude * idleVariance, 1],
                              rotate: walking
                                  ? [walkTilt, -walkTilt, walkTilt]
                                  : isIdleLike
                                    ? [0, 0.6 * idleVariance, 0]
                                    : isStudying
                                      // Sprint 6.7A-3: a faint, steady lean rather than a
                                      // sway — "settled over the desk," not restless.
                                      ? [-0.4, -0.2, -0.4]
                                      : 0,
                          }
                }
                transition={{
                    duration: walking ? breathDuration * 0.6 : breathDuration,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            >
                {/* Blink overlay — a simple eyelid pinch positioned over the eyes. */}
                <motion.div
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: '38%',
                        width: '34%',
                        height: '10%',
                        transform: 'translate(-50%, -50%)',
                        transformOrigin: 'center',
                        background: 'var(--mochi-eyelid, #2a2a2a)',
                        borderRadius: '999px',
                    }}
                    animate={{ scaleY: eyesShut ? 1 : 0, opacity: eyesShut ? 1 : 0 }}
                    transition={{ duration: eyesShut ? 0.06 : 0.09, ease: 'easeInOut' }}
                />
            </motion.div>

            {/* Emotion overlay — a small glow, cross-fades on change. */}
            <AnimatePresence mode="wait">
                {emotion !== 'neutral' && (
                    <motion.div
                        key={emotion}
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 0.8, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        style={{
                            position: 'absolute',
                            top: '6%',
                            right: '10%',
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            background: EMOTION_COLOR[emotion],
                            boxShadow: `0 0 12px 4px ${EMOTION_COLOR[emotion]}`,
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Fake Celebrate — temporary stand-in scale-bounce, composed with fishSpawn + the happy emotion overlay above. */}
            <AnimatePresence>
                {fakeCelebrate && !reducedMotion && (
                    <motion.div
                        key="celebrate-bounce"
                        style={{ position: 'absolute', inset: 0 }}
                        initial={{ scale: 1 }}
                        animate={{ scale: [1, 1.12, 0.96, 1.04, 1] }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
