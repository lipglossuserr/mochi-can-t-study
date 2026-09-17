/**
 * Environment system — shared types.
 *
 * Sprint 6.1. Same philosophy as `character/types.ts`: this module is
 * pure semantic vocabulary. Nothing here mentions CSS, SVG, Rive, or
 * any other rendering technology — a renderer's job is to translate
 * these numbers into whatever its technology understands (CSS custom
 * properties today, a Rive input tree tomorrow).
 *
 * The environment is deliberately its own, independent system — see
 * `EnvironmentEngine`. It does not import from, extend, or in any way
 * "own" the character engine; the reverse direction (a small React
 * bridge that reads the character's PUBLIC snapshot and nudges the
 * environment) is the only place the two systems ever touch, and nudge
 * is the *building itself*, never a build back into either engine.
 */

/**
 * A coarse, human label for "what part of the day is it right now."
 * Purely a semantic label for consumers that want one (e.g. a future
 * Rive state input) — the actual lighting values are NEVER computed
 * from this label. They're computed continuously from clock time, and
 * this label is derived from the same continuous value, one-way. That
 * ordering is what guarantees lighting can never "jump" at a label
 * boundary: the label changes, but the numbers it was already smoothly
 * approaching don't so much as blink.
 */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

/**
 * A coarse weather reading, mapped down from Open-Meteo's WMO weather
 * codes (see `react/useWeatherSync.ts`). 'unknown' is the permanent
 * default whenever weather sync is off, hasn't resolved yet, or the
 * fetch failed — and 'unknown' behaves EXACTLY like 'clear' in
 * `compute()` below. That equivalence is deliberate: nothing about the
 * room's baseline ambience (the whole `TimeOfDay`/lighting system) is
 * allowed to depend on weather ever loading successfully. Weather is
 * purely an optional extra layer on top of a system that already works
 * completely on its own.
 */
export type WeatherCondition = 'unknown' | 'clear' | 'cloudy' | 'rainy' | 'stormy' | 'snowy'

/**
 * How lively Mochi's presence is right now, coarsened into three
 * bands. This is the ENTIRE surface the character side of the app is
 * allowed to push into the environment — no state names, no behavior
 * details, just "how much ambient life should the room reflect back."
 */
export type MochiActivityLevel = 'calm' | 'neutral' | 'lively'

/**
 * Continuous lighting parameters, all renderer-agnostic numbers.
 * `angleDeg` models the window as the room's one light source sweeping
 * through the day, the way a real room's sunbeam would.
 */
export interface EnvironmentLighting {
    /** 0 (cool moonlight) .. 1 (warm golden/morning light). */
    warmth: number
    /** 0 (near-dark) .. 1 (brightest daylight). */
    brightness: number
    /** Degrees — the window-light's angle, sweeping slowly through the day. */
    angleDeg: number
}

/**
 * One immutable snapshot of everything a renderer needs to draw the
 * room's atmosphere. Same "hand out a new object only when something
 * changes" contract `CharacterSnapshot` already established, so this
 * also satisfies `useSyncExternalStore` directly.
 */
export interface EnvironmentSnapshot {
    timeOfDay: TimeOfDay
    lighting: EnvironmentLighting
    /**
     * 0..1 — a single multiplier every ambient-motion consumer (dust,
     * curtain sway, plant sway, drifting shadow) reads. Combines a
     * time-of-day baseline (quieter at night) with Mochi's own
     * activity level. Never a gate — motion never fully seizes except
     * when reduced motion is requested, and even then the room keeps
     * its (static) lighting.
     */
    motionLevel: number
    /** Mirrors the OS/browser preference so JS-driven consumers (not just CSS) can skip work entirely. */
    reducedMotion: boolean
    /** See `WeatherCondition`. 'unknown' unless the user has explicitly opted into weather sync (see `react/useWeatherSync.ts`) and it's successfully resolved at least once. */
    weather: WeatherCondition
}

/** The environment engine's public write surface. */
export interface EnvironmentActions {
    /** The one thing the rest of the app is allowed to tell the environment. */
    setMochiActivity: (level: MochiActivityLevel) => void
    /** Pushed by `useWeatherSync` once a fetch resolves — see that hook for the opt-in gating (this engine never fetches or asks for geolocation permission itself). */
    setWeather: (weather: WeatherCondition) => void
}
