import type {
    EnvironmentActions,
    EnvironmentLighting,
    EnvironmentSnapshot,
    MochiActivityLevel,
    TimeOfDay,
    WeatherCondition,
} from './types'
import { prefersReducedMotion } from './utils/reducedMotion'

/**
 * EnvironmentEngine — Sprint 6.1.
 *
 * A fully independent sibling to `CharacterEngine`, not a part of it.
 * It knows nothing about feeding, playing, studying, memory, or
 * routine — only "what time is it locally" and "how lively should the
 * room's ambience read right now." Composed the same way
 * `CharacterEngine` composes `BehavioralMemory`/`RoomPresence`
 * internally, except here there's nothing to compose *with* — this
 * one class is the whole system, on purpose, because the brief's own
 * scope ("environmental storytelling," never "gameplay, emotions,
 * memories, currencies, mechanics") doesn't call for more than one
 * small module.
 *
 * Same public contract as `CharacterEngine`: `subscribe` +
 * `getSnapshot`, ready for `useSyncExternalStore`; a tiny `actions`
 * surface (just `setMochiActivity`) instead of a large one, because
 * that really is the entire thing the rest of the app is allowed to
 * tell it.
 *
 * ---------------------------------------------------------------
 * Why lighting is computed from CONTINUOUS clock time, not from a
 * discrete "which of 4 periods are we in" switch:
 *
 * A naive version of this feature picks one of four fixed lighting
 * presets keyed by `getHours()` and swaps between them. That produces
 * a visible "jump" the instant the clock crosses an hour boundary —
 * exactly the "abrupt change" the brief prohibits. Instead, every
 * lighting number is read off a smooth curve across the full 24 hours
 * (`sampleCurve` below), and `timeOfDay` is only a LABEL derived from
 * that same continuous hour value, never an input to it. The result
 * is structural, not tuned: there is no hour at which the numbers
 * change any faster than at any other hour.
 * ---------------------------------------------------------------
 */

/** How often we re-sample the clock. Deliberately sparse — see Performance notes in changes.md. */
const TICK_MS = 60_000

/** Multiplier applied to the time-of-day motion baseline for each activity band. */
const ACTIVITY_MULTIPLIER: Record<MochiActivityLevel, number> = {
    calm: 0.45,
    neutral: 1,
    lively: 1.35,
}

/**
 * Weather's own multiplicative adjustment on top of the time-of-day
 * curves — never a replacement for them. 'unknown'/'clear' are both
 * `1` across the board on purpose: a room with weather sync off (the
 * default) or a fetch that hasn't resolved yet must render byte-for-
 * byte identically to how this engine behaved before weather existed.
 * Values are deliberately gentle multipliers (0.7–1.15), not new
 * curves of their own — this stays "a mood the room is already in
 * gets a little moodier," never a second independent lighting system
 * fighting the time-of-day one for control.
 */
const WEATHER_ADJUSTMENT: Record<WeatherCondition, { brightness: number; warmth: number; motion: number }> = {
    unknown: { brightness: 1, warmth: 1, motion: 1 },
    clear: { brightness: 1, warmth: 1, motion: 1 },
    cloudy: { brightness: 0.85, warmth: 0.92, motion: 0.95 },
    rainy: { brightness: 0.7, warmth: 0.85, motion: 0.85 }, // cozier, a touch calmer — see AmbientLayer for the actual rain streaks
    stormy: { brightness: 0.55, warmth: 0.8, motion: 1.15 }, // darkest and the one condition that's slightly MORE restless, not less
    snowy: { brightness: 0.8, warmth: 0.72, motion: 0.7 }, // coolest light, hushed motion
}

/** A handful of (hour, value) anchors across the day; sampled with smooth cosine blending in between. */
type CurvePoint = [hour: number, value: number]

const WARMTH_CURVE: CurvePoint[] = [
    [0, 0.16],
    [5, 0.2],
    [7, 0.85], // sunrise — warm, low sun
    [10, 0.55],
    [13, 0.42], // midday — neutral, least "warm"
    [17, 0.7],
    [19.5, 0.95], // golden hour peak
    [21, 0.4],
    [23, 0.2],
    [24, 0.16],
]

const BRIGHTNESS_CURVE: CurvePoint[] = [
    [0, 0.1],
    [5, 0.14],
    [7, 0.5],
    [10, 0.85],
    [13, 0.95], // brightest point of the day
    [17, 0.78],
    [19.5, 0.5],
    [21, 0.22],
    [23, 0.12],
    [24, 0.1],
]

const ANGLE_CURVE: CurvePoint[] = [
    [0, 6],
    [5, 7],
    [7, 14],
    [10, 26],
    [13, 34], // sun highest, steepest window angle
    [17, 24],
    [19.5, 15],
    [21, 9],
    [23, 6],
    [24, 6],
]

/** Cosine ("smoothstep-like") interpolation — no linear kinks at any anchor. */
function smoothBlend(a: number, b: number, t: number): number {
    const eased = (1 - Math.cos(t * Math.PI)) / 2
    return a + (b - a) * eased
}

/** Samples a wraparound 24h curve at an arbitrary decimal hour. */
function sampleCurve(curve: CurvePoint[], hour: number): number {
    const h = ((hour % 24) + 24) % 24
    for (let i = 0; i < curve.length - 1; i += 1) {
        const [h0, v0] = curve[i]
        const [h1, v1] = curve[i + 1]
        if (h >= h0 && h <= h1) {
            const t = h1 === h0 ? 0 : (h - h0) / (h1 - h0)
            return smoothBlend(v0, v1, t)
        }
    }
    // Should be unreachable given the curves span 0..24, but keep a safe fallback.
    return curve[curve.length - 1][1]
}

function decimalHourNow(): number {
    const now = new Date()
    return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600
}

function labelFor(hour: number): TimeOfDay {
    const h = ((hour % 24) + 24) % 24
    if (h >= 5 && h < 11) return 'morning'
    if (h >= 11 && h < 17) return 'afternoon'
    if (h >= 17 && h < 20) return 'evening'
    return 'night'
}

/** How close two numbers need to be to skip a republish (perf — see RoomPresence's own "only publish on real change" idiom). */
const EPSILON = 0.01

function nearlyEqual(a: number, b: number): boolean {
    return Math.abs(a - b) < EPSILON
}

export class EnvironmentEngine {
    private listeners = new Set<() => void>()
    private snapshot: EnvironmentSnapshot
    private activity: MochiActivityLevel = 'neutral'
    private weather: WeatherCondition = 'unknown'
    private reduced: boolean
    private timer: ReturnType<typeof setInterval> | undefined
    private mediaQuery: MediaQueryList | undefined
    private onReducedMotionChange = (): void => {
        this.reduced = prefersReducedMotion()
        this.publish(this.compute())
    }

    constructor() {
        this.reduced = prefersReducedMotion()
        this.snapshot = this.compute()

        if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
            this.mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
            this.mediaQuery.addEventListener?.('change', this.onReducedMotionChange)
        }

        this.timer = setInterval(() => {
            this.publish(this.compute())
        }, TICK_MS)
    }

    getSnapshot = (): EnvironmentSnapshot => this.snapshot

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
    }

    actions: EnvironmentActions = {
        setMochiActivity: (level: MochiActivityLevel) => {
            if (level === this.activity) return
            this.activity = level
            this.publish(this.compute())
        },
        setWeather: (weather: WeatherCondition) => {
            if (weather === this.weather) return
            this.weather = weather
            this.publish(this.compute())
        },
    }

    dispose(): void {
        if (this.timer) clearInterval(this.timer)
        this.mediaQuery?.removeEventListener?.('change', this.onReducedMotionChange)
        this.listeners.clear()
    }

    // ------------------------------------------------------------------

    private compute(): EnvironmentSnapshot {
        const hour = decimalHourNow()
        const adjustment = WEATHER_ADJUSTMENT[this.weather]
        const lighting: EnvironmentLighting = {
            warmth: sampleCurve(WARMTH_CURVE, hour) * adjustment.warmth,
            brightness: sampleCurve(BRIGHTNESS_CURVE, hour) * adjustment.brightness,
            angleDeg: sampleCurve(ANGLE_CURVE, hour), // weather doesn't move the sun — only how much of it gets through
        }
        // Quieter at night/deep evening, a touch livelier at brightness peak —
        // the room's OWN baseline restlessness, before Mochi's state adjusts it.
        // Uses the UN-adjusted brightness curve for this baseline (weather
        // dimming the light shouldn't, by itself, quiet the room down twice —
        // that's what WEATHER_ADJUSTMENT.motion is for, applied once, below).
        const baseMotion = 0.25 + sampleCurve(BRIGHTNESS_CURVE, hour) * 0.55
        const motionLevel = this.reduced
            ? 0
            : Math.min(1, baseMotion * ACTIVITY_MULTIPLIER[this.activity] * adjustment.motion)

        return {
            timeOfDay: labelFor(hour),
            lighting,
            motionLevel,
            reducedMotion: this.reduced,
            weather: this.weather,
        }
    }

    private publish(next: EnvironmentSnapshot): void {
        const prev = this.snapshot
        const unchanged =
            prev.timeOfDay === next.timeOfDay &&
            prev.reducedMotion === next.reducedMotion &&
            prev.weather === next.weather &&
            nearlyEqual(prev.lighting.warmth, next.lighting.warmth) &&
            nearlyEqual(prev.lighting.brightness, next.lighting.brightness) &&
            nearlyEqual(prev.lighting.angleDeg, next.lighting.angleDeg) &&
            nearlyEqual(prev.motionLevel, next.motionLevel)

        if (unchanged) return
        this.snapshot = next
        this.listeners.forEach((listener) => listener())
    }
}
