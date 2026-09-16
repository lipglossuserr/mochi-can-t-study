import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useCharacterEngine } from '../react/CharacterProvider'
import { prefersReducedMotion } from '../utils/reducedMotion'
import type { CharacterRendererProps } from './types'

/**
 * LivingMochiRenderer
 *
 * The hand-drawn Mochi from MochiFallback, grown up: it understands
 * the engine's FULL semantic vocabulary (not just the four legacy Rive
 * inputs) and layers three kinds of life on top:
 *
 *  1. Physiology (always on, pure CSS): breathing, blinking, top-knot
 *     "ear" twitches, a tail flick. Cheap, GPU-only, and automatically
 *     silenced by the prefers-reduced-motion CSS block in globals.css.
 *  2. Cursor awareness (engine.gaze): pupils and a slight head tilt
 *     follow the pointer. Driven imperatively — a rAF loop lerps the
 *     transforms straight onto SVG nodes, so tracking the mouse causes
 *     ZERO React renders.
 *  3. Semantic states: eating, playing, being-petted, sleeping,
 *     stretching, yawning, looking-around... each mapped to a calm,
 *     cat-like pose change rather than a cartoon explosion.
 *  4. Reaction phases (Sprint 5.3A-2): `anticipating-eating`,
 *     `content-eating`, and friends. Anticipation is one small, mostly
 *     still pose (a beat of "she noticed"); content/settle poses are
 *     calmer, longer-breathing versions of their action — the same
 *     mood lingering rather than a brand new one — so the whole arc
 *     reads as one continuous reaction instead of a pose that appears
 *     and vanishes. Recovery back to idle is deliberately NOT a fourth
 *     pose: it's Framer Motion's own default tween between whatever
 *     `bodyAnimation` was and idle's, which is already a smooth blend
 *     rather than a cut — see the transition config below.
 */

/** How far pupils may wander (SVG units) and the head may tilt (deg). */
const PUPIL_RANGE = 4.5
const HEAD_TILT_RANGE = 3.5
/**
 * Split gaze smoothing (Sprint 5.5, renderer smoothing / gaze
 * imperfections / attention shifts): eyes and head used to share one
 * lerp rate, so the head "cut" to match the eyes exactly. Real
 * attention doesn't work that way — the eyes snap to something first,
 * the head catches up a beat later. Two rates, same rAF loop, zero
 * extra passes: EYE_SMOOTHING is quicker (pupils lead), HEAD_SMOOTHING
 * is the original, heavier rate (head trails).
 */
const EYE_SMOOTHING = 0.22
const HEAD_SMOOTHING = 0.12
/** Micro-saccade magnitude (Sprint 5.5): a tiny, quickly-decaying nudge
 *  layered on the eye target only, so cursor tracking doesn't read as
 *  a perfectly precise robot lock — real eyes drift and re-settle. */
const SACCADE_MAGNITUDE = 0.09

/** States where the eyes are closed/arced, so pupils must not track. */
const EYES_CLOSED_STATES = new Set([
    'sleeping',
    'being-petted',
    'content-petted', // still blissfully closed while enjoying the afterglow
    'studying',
    'yawning',
    'stretching',
])

/** The look-around eye-sweep pattern varies its shape each time (Gap 5:
 *  a fixed pattern gets noticeable fast), never just its timing. Picked
 *  once per entry into the state, not per render. */
const LOOK_AROUND_VARIANTS = ['mochi-look-around', 'mochi-look-around-alt', 'mochi-look-around-wide']

/** Fixed "into the room" gaze target for observation moments — deliberately
 *  not the cursor, not zero-center: a calm glance up and away (Requirement 5). */
const OBSERVE_TARGET = { x: -0.55, y: -0.7 }

/**
 * Pose variance range (Sprint 5.5, anticipation polish / tiny idle
 * imperfections): a fresh multiplier in this range is picked once per
 * entry into a reaction/anticipation pose, so the exact same gesture
 * never plays back at exactly the same size twice — timing and shape
 * stay untouched, only the amplitude breathes a little.
 */
const POSE_VARIANCE_MIN = 0.88
const POSE_VARIANCE_MAX = 1.12

/** Scales a translate/rotate amplitude array by a variance multiplier. */
function varyOffset(values: number[], variance: number): number[] {
    return values.map((n) => n * variance)
}
/** Scales a scaleX/scaleY array (values centered on 1) by a variance multiplier. */
function varyScale(values: number[], variance: number): number[] {
    return values.map((n) => 1 + (n - 1) * variance)
}

function LivingMochiRenderer({ state, ariaLabel, afterglow, presence, routineFamiliarity }: CharacterRendererProps) {
    const engine = useCharacterEngine()
    const reduced = useReducedMotion()

    const pupilsRef = useRef<SVGGElement | null>(null)
    const headRef = useRef<SVGGElement | null>(null)
    /** Sprint 5.5: imperative targets for the ambient micro-timers below —
     *  breathing amplitude and the rare double-blink are both nudged
     *  directly via refs, not React state, matching the gaze loop's own
     *  "zero re-renders for ambient motion" approach. */
    const breatheGroupRef = useRef<SVGGElement | null>(null)
    const blinkGroupRef = useRef<SVGGElement | null>(null)
    /** Where the gaze wants to be / currently is (normalized -1..1). */
    const targetRef = useRef<{ x: number; y: number } | null>(null)
    /** Sprint 5.5: eyes and head now ease at different rates (see
     *  EYE_SMOOTHING/HEAD_SMOOTHING) — eyes lead, head trails. */
    const currentEyeRef = useRef({ x: 0, y: 0 })
    const currentHeadRef = useRef({ x: 0, y: 0 })
    /** Micro-saccades (Sprint 5.5): a tiny decaying offset re-rolled every
     *  few seconds, added to the eye goal only — see the ambient-timers
     *  effect below for when it gets re-rolled. */
    const eyeSaccadeRef = useRef({ x: 0, y: 0 })
    const eyesClosedRef = useRef(EYES_CLOSED_STATES.has(state))
    eyesClosedRef.current = EYES_CLOSED_STATES.has(state)
    /** Observation moments (Sprint 5.4): eyes stay open but don't track the
     *  cursor — she's looking into the room, not at the player. */
    const observingRef = useRef(false)
    observingRef.current = state === 'observing-room'
    /** Sprint 6.0: read imperatively inside the ambient-timer closures
     *  below (softer eye movement / steadier breathing when familiar) —
     *  a ref, not a dependency, so those closures don't need to be
     *  recreated every time familiarity ticks. */
    const routineLevelRef = useRef(0)
    routineLevelRef.current = routineFamiliarity?.level ?? 0

    // Cursor awareness: subscribe to the engine's gaze channel and run a
    // rAF loop that eases pupils + head toward the target. Everything
    // happens on refs and setAttribute — React never re-renders for it.
    useEffect(() => {
        if (reduced || prefersReducedMotion()) return

        const unsubscribe = engine.gaze.subscribe((target) => {
            targetRef.current = target
        })

        let frame = 0
        const tick = () => {
            const goal = eyesClosedRef.current
                ? null
                : observingRef.current
                    ? OBSERVE_TARGET
                    : targetRef.current
            const gx = goal ? Math.max(-1, Math.min(1, goal.x)) : 0
            const gy = goal ? Math.max(-1, Math.min(1, goal.y)) : 0

            // Eyes lead (faster, with a tiny decaying saccade layered on
            // top); head trails a beat behind at the original, heavier
            // rate — see EYE_SMOOTHING/HEAD_SMOOTHING above.
            const saccade = eyeSaccadeRef.current
            saccade.x *= 0.92
            saccade.y *= 0.92

            const eye = currentEyeRef.current
            eye.x += (gx + saccade.x - eye.x) * EYE_SMOOTHING
            eye.y += (gy + saccade.y - eye.y) * EYE_SMOOTHING

            const head = currentHeadRef.current
            head.x += (gx - head.x) * HEAD_SMOOTHING
            head.y += (gy - head.y) * HEAD_SMOOTHING

            pupilsRef.current?.setAttribute(
                'transform',
                `translate(${(eye.x * PUPIL_RANGE).toFixed(2)} ${(eye.y * PUPIL_RANGE * 0.7).toFixed(2)})`,
            )
            headRef.current?.setAttribute(
                'transform',
                `rotate(${(head.x * HEAD_TILT_RANGE).toFixed(2)} 100 110)`,
            )
            frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)

        return () => {
            cancelAnimationFrame(frame)
            unsubscribe()
        }
    }, [engine, reduced])

    // Ambient micro-timers (Sprint 5.5): a handful of sparse, independently
    // scheduled timeouts — not a second animation loop — for the polish
    // that needs occasional, not per-frame, updates: re-rolling the
    // micro-saccade, nudging breathing amplitude, and the rare double
    // blink. All imperative (direct DOM/ref writes), matching the gaze
    // loop's own "zero React re-renders for ambient motion" philosophy.
    useEffect(() => {
        if (reduced || prefersReducedMotion()) return
        const timers: Array<ReturnType<typeof setTimeout>> = []

        const scheduleSaccade = () => {
            timers.push(
                setTimeout(() => {
                    if (!eyesClosedRef.current && !observingRef.current) {
                        // Sprint 6.0: a recognized recent flow softens the
                        // saccade a little — steadier, less darting, without
                        // ever fully switching gaze noise off.
                        const settle = 1 - 0.5 * routineLevelRef.current
                        eyeSaccadeRef.current = {
                            x: (Math.random() - 0.5) * 2 * SACCADE_MAGNITUDE * settle,
                            y: (Math.random() - 0.5) * 2 * SACCADE_MAGNITUDE * settle,
                        }
                    }
                    scheduleSaccade()
                }, 2600 + Math.random() * 3600),
            )
        }

        const scheduleBreathAmp = () => {
            timers.push(
                setTimeout(() => {
                    // Sprint 6.0: familiarity narrows the amplitude jitter
                    // range toward 1 — breathing reads as a touch more
                    // consistent during a recognized, settled routine.
                    const settle = 1 - 0.4 * routineLevelRef.current
                    const deviation = (Math.random() - 0.5) * 0.3 * settle
                    breatheGroupRef.current?.style.setProperty('--breath-amp', (1 + deviation).toFixed(2))
                    scheduleBreathAmp()
                }, 5200 + Math.random() * 4200),
            )
        }

        const scheduleDoubleBlink = () => {
            timers.push(
                setTimeout(() => {
                    const el = blinkGroupRef.current
                    if (el) {
                        el.classList.add('mochi-blink-pulse')
                        timers.push(setTimeout(() => el.classList.remove('mochi-blink-pulse'), 320))
                    }
                    scheduleDoubleBlink()
                }, 22000 + Math.random() * 26000),
            )
        }

        scheduleSaccade()
        scheduleBreathAmp()
        scheduleDoubleBlink()

        return () => timers.forEach((t) => clearTimeout(t))
    }, [reduced])

    // ---- semantic state → pose ----
    const isStudying = state === 'studying'
    const isCelebrating = state === 'celebrating'
    const isHappy = state === 'happy'
    const isEating = state === 'eating'
    const isPlaying = state === 'playing'
    const isPetted = state === 'being-petted'
    const isSleeping = state === 'sleeping'
    const isStretching = state === 'stretching'
    const isYawning = state === 'yawning'
    const isLookingAround = state === 'looking-around'
    // Player awareness (Design D): a brief, still "she noticed you" beat,
    // layered on top of the continuous cursor tracking above — distinct
    // from it (a discrete pose that fires rarely) rather than a
    // replacement for it.
    const isCuriosityPause = state === 'curiosity-pause'
    // Environmental awareness (Sprint 5.4): the rarest idle beat — a
    // brief, still pause where she looks into the room rather than at
    // the cursor or any UI (Requirement 5).
    const isObserving = state === 'observing-room'

    // Reaction phases (Sprint 5.3A-2). `isAnticipating*` covers the brief
    // notice-beat before a reaction; `isContent*` covers its settle tail.
    const isAnticipatingEating = state === 'anticipating-eating'
    const isAnticipatingPlaying = state === 'anticipating-playing'
    const isAnticipatingCelebrating = state === 'anticipating-celebrating'
    const isAnticipating = isAnticipatingEating || isAnticipatingPlaying || isAnticipatingCelebrating
    const isContentEating = state === 'content-eating'
    const isContentPlaying = state === 'content-playing'
    const isContentPetted = state === 'content-petted'
    const isContentCelebrating = state === 'content-celebrating'

    const closedEyes = isSleeping || isPetted || isContentPetted
    const contentEyes = isPetted || isContentPetted // closed *upward* arcs — blissful, not asleep

    /**
     * Emotional afterglow (Design E / Renderer polish H). Only ever
     * softens the *plain* idle pose — a real reaction pose (eating,
     * playing, ...) already carries its own mood, so afterglow never
     * fights it for attention. `isPlainIdle` deliberately excludes the
     * idle micro-states too: a stretch or a look-around already reads
     * as its own moment and shouldn't also be tinted.
     */
    const isPlainIdle = state === 'idle'
    const afterglowFresh = isPlainIdle && afterglow?.phase === 'fresh' ? afterglow.kind : null
    const afterglowAny = isPlainIdle ? afterglow?.kind ?? null : null
    const afterglowWarm = afterglowAny === 'petted' || afterglowAny === 'celebrated'
    const afterglowRelaxed = afterglowAny === 'fed'
    const afterglowLively = afterglowAny === 'played'

    /**
     * Room presence (Sprint 5.4, Requirement 8). Same restraint as
     * afterglow: only ever softens the *plain* idle pose, never a real
     * reaction or another idle micro-state — a stretch or look-around
     * already reads as its own moment. `quietness` is 0/0.55/1 rather
     * than a raw stage string so every duration/opacity calc below can
     * treat it as a simple multiplier, exactly like `strong` does for
     * afterglow above.
     */
    const presenceStage = isPlainIdle ? presence?.stage ?? 'active' : 'active'
    const quietness = presenceStage === 'deep-quiet' ? 1 : presenceStage === 'quiet' ? 0.55 : 0
    const comfort = isPlainIdle ? presence?.comfort ?? 0 : 0

    /**
     * Routine familiarity (Sprint 6.0). Same restraint pattern as
     * afterglow/presence above: `routineLevel` only ever softens the
     * *plain* idle pose. `observingWarmth` is the one deliberate
     * exception — observation moments are their own state, not plain
     * idle, and the brief specifically asks for them to read "slightly
     * warmer" when a recognized routine is behind them.
     */
    const routineLevel = isPlainIdle ? routineFamiliarity?.level ?? 0 : 0
    const observingWarmth = isObserving ? routineFamiliarity?.level ?? 0 : 0

    /**
     * Blink softness (Design H / Sprint 5.4 Requirement 8's "softer
     * eyes"): lengthens while a warm afterglow is fresh OR the room has
     * been quiet a while — both read as "relaxed", so they combine by
     * taking whichever is calmer (slower) rather than stacking.
     */
    const blinkDuration = (() => {
        const fromAfterglow = afterglowFresh && afterglowWarm ? 6.4 : 0
        const fromQuiet = quietness > 0 ? 6 + 1.4 * quietness : 0
        const slowest = Math.max(fromAfterglow, fromQuiet)
        return slowest > 0 ? `${slowest}s` : undefined
    })()

    /**
     * Ambient personality polish (Sprint 5.5): the ear/tail twitch loops
     * were fixed-frequency regardless of mood. They now stretch out a
     * little during quiet/comfortable stretches (a calmer, less fidgety
     * companion) and tighten up a touch right after a lively afterglow —
     * same restrained "only ever affects plain idle" rule as breathing
     * and blinking, and the same "take the calmest applicable value"
     * combining approach.
     */
    const earTwitchDuration = isPlainIdle
        ? quietness > 0
            ? `${(8.5 + 3.2 * quietness).toFixed(1)}s`
            : afterglowLively
                ? '6.2s'
                : comfort > 0.4
                    ? `${(8.5 + 1.8 * comfort).toFixed(1)}s`
                    : undefined
        : undefined
    const tailFlickDuration = isPlainIdle
        ? quietness > 0
            ? `${(7.2 + 2.6 * quietness).toFixed(1)}s`
            : afterglowLively
                ? '5.4s'
                : comfort > 0.4
                    ? `${(7.2 + 1.4 * comfort).toFixed(1)}s`
                    : undefined
        : undefined

    // Picked once per entry into 'looking-around', not per render — a
    // ref mutated during render is safe here because it only ever
    // depends on this component's own previous value, and (unlike
    // state) never needs to trigger a re-render itself.
    const wasLookingAroundRef = useRef(false)
    const lookAroundVariantRef = useRef(LOOK_AROUND_VARIANTS[0])
    if (isLookingAround && !wasLookingAroundRef.current) {
        lookAroundVariantRef.current =
            LOOK_AROUND_VARIANTS[Math.floor(Math.random() * LOOK_AROUND_VARIANTS.length)]
    }
    wasLookingAroundRef.current = isLookingAround

    /**
     * Pose variance (Sprint 5.5, anticipation polish / tiny idle
     * imperfections): a fresh amplitude multiplier is picked once per
     * entry into a reaction or anticipation pose — tracked the same way
     * `wasLookingAroundRef` tracks entry into looking-around above.
     * Timing and shape stay exactly as designed; only how big the
     * gesture reads shifts a little, so the same reaction never plays
     * back at identically the same size twice.
     */
    const reactionStateKey = isAnticipating
        ? 'anticipating'
        : isCelebrating
            ? 'celebrating'
            : isContentCelebrating
                ? 'content-celebrating'
                : isHappy
                    ? 'happy'
                    : isEating
                        ? 'eating'
                        : isContentEating
                            ? 'content-eating'
                            : isPlaying
                                ? 'playing'
                                : isContentPlaying
                                    ? 'content-playing'
                                    : isPetted
                                        ? 'petted'
                                        : isContentPetted
                                            ? 'content-petted'
                                            : null
    const prevReactionStateRef = useRef<string | null>(null)
    const poseVarianceRef = useRef(1)
    if (reactionStateKey && reactionStateKey !== prevReactionStateRef.current) {
        poseVarianceRef.current = POSE_VARIANCE_MIN + Math.random() * (POSE_VARIANCE_MAX - POSE_VARIANCE_MIN)
    }
    prevReactionStateRef.current = reactionStateKey
    const poseVariance = poseVarianceRef.current

    /**
     * Routine familiarity (Sprint 6.0): a recognized recent flow makes
     * the anticipation beat read as a little more confident — a
     * smaller, calmer lean-in rather than a bigger startle — layered on
     * top of, never replacing, Sprint 5.5's own per-occurrence pose
     * variance above.
     */
    const anticipationConfidence = 1 - 0.3 * (routineFamiliarity?.level ?? 0)

    /**
     * Body motion per state. Calm by default; reduced-motion damps to a
     * hush. Eating/playing/celebrating were previously one "bounce +
     * rotate" primitive resized three ways (Gap 1) — they're now three
     * different shapes of motion: eating is a small, mostly-vertical,
     * quick nod timed to match the chewing mouth; playing is a livelier
     * side-to-side batting motion; celebrating is the big one, unchanged.
     * Anticipation poses are almost still (a beat of attention, not a
     * gesture); content poses are gentler, slower echoes of their
     * action rather than a new pose, so the whole arc reads as one held
     * breath rather than three separate animations glued together.
     * Reaction/anticipation amplitudes now run through `poseVariance`
     * (Sprint 5.5) — see the doc comment above.
     */
    const bodyAnimation = reduced
        ? { y: 0 }
        : isAnticipating
            ? {
                y: varyOffset([0, -2, -2], poseVariance * anticipationConfidence),
                rotate: varyOffset(
                    [0, isAnticipatingPlaying ? 2 : 0, isAnticipatingPlaying ? 2 : 0],
                    poseVariance * anticipationConfidence,
                ),
            } // a small lean-in, ears up — calmer when the flow feels familiar (Sprint 6.0)
            : isCelebrating
                ? {
                    y: varyOffset([0, -22, 0, -12, 0], poseVariance),
                    scaleX: varyScale([1, 0.95, 1.05, 0.97, 1], poseVariance),
                    scaleY: varyScale([1, 1.08, 0.94, 1.04, 1], poseVariance),
                }
                : isContentCelebrating
                    ? { y: varyOffset([0, -9, 0], poseVariance), rotate: varyOffset([0, 2, -2, 0], poseVariance) } // joy winding down, not gone
                    : isHappy
                        ? { y: varyOffset([0, -10, 0, -6, 0], poseVariance), rotate: varyOffset([0, -3, 3, -1, 0], poseVariance) }
                        : isEating
                            ? { y: varyOffset([0, -3, 0], poseVariance), rotate: varyOffset([0, -1, 1, 0], poseVariance) } // small, quick, focused on the food
                            : isContentEating
                                ? {
                                    y: varyOffset([0, -4, 0], poseVariance),
                                    scaleX: varyScale([1, 1.015, 1], poseVariance),
                                    scaleY: varyScale([1, 1.01, 1], poseVariance),
                                } // a happy little sway, tummy full
                                : isPlaying
                                    ? {
                                        rotate: varyOffset([0, -8, 8, -5, 5, 0], poseVariance),
                                        y: varyOffset([0, -9, 0, -4, 0], poseVariance),
                                    } // batting at something, livelier
                                    : isContentPlaying
                                        ? { y: varyOffset([0, -6, 0], poseVariance), rotate: varyOffset([0, -2, 2, 0], poseVariance) } // still pleased, no longer wound up
                                        : isPetted
                                            ? {
                                                rotate: varyOffset([0, 2.5, 2.5, 0], poseVariance),
                                                y: varyOffset([0, 2, 2, 0], poseVariance),
                                            } // leans into the hand
                                            : isContentPetted
                                                ? {
                                                    y: varyOffset([0, 1.5, 1.5, 0], poseVariance),
                                                    scaleY: varyScale([1, 0.99, 1], poseVariance),
                                                } // lingering, slower version of the lean
                                                : isStretching
                                                    ? { scaleX: [1, 1.12, 1.12, 1], scaleY: [1, 0.9, 0.9, 1] }
                                                    : isSleeping
                                                        ? { y: [0, 2, 0], scaleY: [1, 0.985, 1] }
                                                        : isCuriosityPause
                                                            // Player awareness (Design D): barely a gesture at all — a
                                                            // held, slightly wider breath, as if she'd paused to notice.
                                                            // Deliberately NOT a head-turn: the continuous gaze system
                                                            // already handles looking toward the cursor; this only adds
                                                            // the "she paused" beat on top of it.
                                                            ? { y: [0, -1.5, -1.5], scaleY: [1, 1.01, 1.01] }
                                                            : isObserving
                                                                // Observation moments (Requirement 5): the calmest, most
                                                                // held pose of all — barely a breath, longer than
                                                                // curiosity-pause's, reading as "quietly taking in the
                                                                // room" rather than noticing any one thing.
                                                                ? { y: [0, -1, -1], scaleY: [1, 1.012, 1.012] }
                                                                : { y: [0, -8, 0], scaleX: [1, 1.02, 0.99, 1], scaleY: [1, 0.98, 1.015, 1] }

    const bodyDuration = isAnticipating
        ? 0.26 // a held beat, not a loop — barely finishes once before the action takes over
        : isCelebrating
            ? 1.1
            : isContentCelebrating
                ? 1.3
                : isHappy
                    ? 0.9
                    : isEating
                        ? 0.6 // quick, timed close to the chewing mouth's own 0.45s pulse
                        : isContentEating
                            ? 1.4
                            : isPlaying
                                ? 0.8
                                : isContentPlaying
                                    ? 1.3
                                    : isPetted
                                        ? 1.6
                                        : isContentPetted
                                            ? 2.0 // the longest, slowest breath — she's settling all the way down
                                            : isStretching
                                                ? 1.6
                                                : isSleeping
                                                    ? 5.6
                                                    : isStudying
                                                        ? 5.2
                                                        : isCuriosityPause
                                                            ? 1.3 // held just long enough to read as a pause, not a freeze
                                                            : isObserving
                                                                // Observation moments (Requirement 5): the calmest, most
                                                                // held pose of all — barely a breath, longer than
                                                                // curiosity-pause's, reading as "quietly taking in the
                                                                // room" rather than noticing any one thing. Sprint 6.0:
                                                                // held a touch longer still when a recognized routine
                                                                // is behind it — "warmer," not bigger.
                                                                ? 2.6 + 0.4 * observingWarmth
                                                                // Emotional afterglow (Design E / H) + room presence
                                                                // (Sprint 5.4, Requirement 1 & 8) + routine familiarity
                                                                // (Sprint 6.0): plain idle breathing gently loosens
                                                                // (relaxed/quiet/familiar) or quickens (lively)
                                                                // depending on what just happened, how long it's been
                                                                // peaceful, AND whether this feels like a recognized
                                                                // routine — the same idle pose, a different mood
                                                                // underneath it, never a new pose of its own. All three
                                                                // influences take the calmest (slowest) of what applies
                                                                // rather than fighting each other.
                                                                : Math.max(
                                                                    afterglowRelaxed
                                                                        ? (afterglowFresh ? 5.1 : 4.6)
                                                                        : afterglowLively
                                                                            ? (afterglowFresh ? 3.3 : 3.8)
                                                                            : 4.2,
                                                                    quietness > 0 ? 4.2 + 1.3 * quietness : 0,
                                                                    routineLevel > 0 ? 4.2 + 0.7 * routineLevel : 0,
                                                                )

    return (
        <motion.div
            className="relative mx-auto h-full w-full"
            animate={bodyAnimation}
            transition={{ duration: bodyDuration, repeat: Infinity, ease: 'easeInOut' }}
            role="img"
            aria-label={ariaLabel}
        >
            {/* floating glyphs per state — restrained: 2–3, never a storm.
                Content/settle phases keep a quieter, shrinking trace of the
                same glyphs rather than cutting straight to none, so the
                "she's still glowing from that" feeling fades out instead
                of switching off. */}
            {isCelebrating && (
                <>
                    <span className="sparkle absolute -top-2 left-2 text-lg text-taro">✦</span>
                    <span className="sparkle absolute -top-4 right-4 text-lg text-blush" style={{ animationDelay: '0.3s' }}>✦</span>
                    <span className="sparkle absolute top-6 right-0 text-base text-rosegold" style={{ animationDelay: '0.6s' }}>✦</span>
                </>
            )}
            {isContentCelebrating && (
                <span className="sparkle absolute -top-2 right-2 text-sm text-rosegold">✦</span>
            )}
            {(isHappy || isPetted || isContentPetted || isContentEating || isContentPlaying) && (
                <>
                    <span className="sparkle absolute -top-3 left-6 text-base text-blush">♡</span>
                    {!isContentEating && !isContentPlaying && (
                        <span className="sparkle absolute -top-1 right-2 text-sm text-rosegold" style={{ animationDelay: '0.4s' }}>♡</span>
                    )}
                </>
            )}
            {(isPetted || isContentPetted) && (
                <span className="mochi-purr absolute -right-3 top-8 select-none font-body text-xs text-taro/70">
          ﹏
        </span>
            )}
            {isSleeping && (
                <span className="mochi-zzz absolute -top-2 right-4 select-none font-body text-sm text-ink/40">
          z z
        </span>
            )}

            <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-xl">
                <defs>
                    <radialGradient id="livingMochiBody" cx="35%" cy="28%" r="80%">
                        <stop offset="0%" stopColor="#FFFFFF" />
                        <stop offset="55%" stopColor="#FBEFF6" />
                        <stop offset="100%" stopColor="#F0D9EA" />
                    </radialGradient>
                </defs>

                {/* tail: a soft curl that flicks now and then (CSS keyframes) */}
                <g className="mochi-tail" style={{ transformOrigin: '168px 158px', animationDuration: tailFlickDuration }}>
                    <path
                        d="M166 158 Q188 150 184 132"
                        stroke="#F0D9EA"
                        strokeWidth="10"
                        strokeLinecap="round"
                        fill="none"
                    />
                </g>

                {/* the whole head/body group tilts subtly toward the cursor */}
                <g ref={headRef}>
                    {/* breathing lives on its own group so it composes with the
                        tilt. Afterglow (Design E/H) softens the rhythm itself —
                        a touch slower and looser right after being fed/petted/
                        celebrated — purely a CSS animation-duration override,
                        no new keyframes, no new assets. */}
                    <g
                        ref={breatheGroupRef}
                        className="mochi-breathe"
                        style={{
                            transformOrigin: '100px 150px',
                            animationDuration: afterglowWarm || afterglowRelaxed || quietness > 0
                                ? `${Math.max(
                                    afterglowWarm || afterglowRelaxed ? (afterglowFresh ? 5.6 : 5) : 0,
                                    quietness > 0 ? 5 + 0.9 * quietness : 0,
                                )}s`
                                : undefined,
                        }}
                    >
                        {/* top knot — doubles as an "ear" that twitches occasionally */}
                        <g
                            className="mochi-ear"
                            style={{ transformOrigin: '100px 45px', animationDuration: earTwitchDuration }}
                        >
                            <ellipse cx="100" cy="38" rx="15" ry="13" fill="url(#livingMochiBody)" />
                        </g>

                        {/* body */}
                        <ellipse cx="100" cy="114" rx="86" ry="76" fill="url(#livingMochiBody)" />

                        {/* blush cheeks — a touch deeper while being petted, and
                            lingering warmer for a while afterward (afterglow).
                            Sprint 5.5: a short CSS transition on opacity so this
                            (and every other opacity-only expression shift) eases
                            rather than snaps between states. Sprint 6.0: a hair
                            warmer during an observation moment that followed a
                            recognized routine — "warmer," never a new pose. */}
                        <ellipse
                            cx="57" cy="122" rx="13" ry="8.5" fill="#F0A8BE"
                            opacity={
                                isPetted || isContentPetted ? 0.95 : afterglowWarm ? 0.82 : 0.7 + 0.06 * observingWarmth
                            }
                            style={{ transition: 'opacity 240ms ease' }}
                        />
                        <ellipse
                            cx="143" cy="122" rx="13" ry="8.5" fill="#F0A8BE"
                            opacity={
                                isPetted || isContentPetted ? 0.95 : afterglowWarm ? 0.82 : 0.7 + 0.06 * observingWarmth
                            }
                            style={{ transition: 'opacity 240ms ease' }}
                        />

                        {/* ---- eyes ---- */}
                        {isStudying ? (
                            // focused half-lidded arcs (unchanged from the classic look)
                            <>
                                <path d="M69 104 Q76 98 83 104" stroke="#382C3E" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                                <path d="M117 104 Q124 98 131 104" stroke="#382C3E" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                            </>
                        ) : closedEyes ? (
                            contentEyes ? (
                                // blissful ˘ ˘ — closed upward while leaning into the pet
                                <>
                                    <path d="M69 103 Q76 109 83 103" stroke="#382C3E" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                                    <path d="M117 103 Q124 109 131 103" stroke="#382C3E" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                                </>
                            ) : (
                                // asleep — soft flat lids
                                <>
                                    <path d="M69 105 Q76 107 83 105" stroke="#382C3E" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                                    <path d="M117 105 Q124 107 131 105" stroke="#382C3E" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                                </>
                            )
                        ) : (
                            <>
                                {/* open eyes: pupils track the cursor */}
                                <g ref={pupilsRef} className={isLookingAround ? lookAroundVariantRef.current : undefined}>
                                    <circle cx="76" cy="104" r="5" fill="#382C3E" />
                                    <circle cx="124" cy="104" r="5" fill="#382C3E" />
                                </g>
                                {/* eyelids sweep down briefly on a randomized blink cycle —
                                    softened a touch (slightly longer, gentler cycle) while a
                                    warm afterglow is fresh, so blinking itself reads as more
                                    relaxed rather than alert. The animation lives on the rects
                                    themselves (see globals.css), so the override goes there too. */}
                                <g ref={blinkGroupRef} className="mochi-blink">
                                    <rect
                                        x="66" y="93" width="22" height="0.5" rx="4" fill="#FBEFF6"
                                        style={{ animationDuration: blinkDuration }}
                                    />
                                    <rect
                                        x="112" y="93" width="22" height="0.5" rx="4" fill="#FBEFF6"
                                        style={{ animationDuration: blinkDuration }}
                                    />
                                </g>
                            </>
                        )}

                        {/* ---- mouth ---- */}
                        {isYawning ? (
                            <ellipse cx="100" cy="128" rx="9" ry="12" fill="#382C3E" opacity="0.85" />
                        ) : isEating ? (
                            // chewing only while actually eating — once she's
                            // satisfied (content-eating) the mouth settles
                            // into the same calm smile as any other content
                            // phase, which is what actually reads as "done,
                            // and happy about it" rather than still chewing
                            <g className="mochi-nom" style={{ transformOrigin: '100px 128px' }}>
                                <ellipse cx="100" cy="128" rx="10" ry="7" fill="#382C3E" opacity="0.85" />
                            </g>
                        ) : (
                            <path
                                d={
                                    isCelebrating ||
                                    isContentCelebrating ||
                                    isHappy ||
                                    isPetted ||
                                    isContentPetted ||
                                    isPlaying ||
                                    isContentPlaying ||
                                    isContentEating ||
                                    // Emotional afterglow (Design E/H): the fuller smile
                                    // lingers a while into plain idle too, rather than
                                    // snapping back the instant the reaction overlay ends.
                                    // Behavioral momentum (Sprint 5.4, Requirement 6) does
                                    // the same thing on a slower timescale: enough
                                    // accumulated comfort softens the smile even with no
                                    // afterglow active at all.
                                    afterglowWarm ||
                                    comfort > 0.6
                                        ? 'M80 122 Q100 142 120 122'
                                        : 'M85 124 Q100 136 115 124'
                                }
                                stroke="#382C3E"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                fill="none"
                            />
                        )}
                    </g>
                </g>
            </svg>
        </motion.div>
    )
}

export default LivingMochiRenderer