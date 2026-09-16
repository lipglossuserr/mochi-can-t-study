import type { AfterglowState, MemoryKind } from '../types'

/**
 * BehavioralMemory — Sprint 5.3B.
 *
 * The engine's only notion of "recent past". It is deliberately NOT:
 *  - save data (nothing here survives a page refresh, nor should it)
 *  - a progression system (there's no accumulation, no meter to grind)
 *  - a permanent mood (it always, eventually, fades to nothing)
 *
 * It IS a single fact: "the most recent thing that happened to her,
 * and how long ago". Only one influence is ever tracked at a time —
 * the most recent one replaces whatever came before, which keeps the
 * whole system legible (no blended-mood math to reason about) and
 * matches how the brief frames it: "recent emotional influence", not
 * an accumulated stat.
 *
 * Decay is two-stage rather than a continuously-sampled curve:
 * `fresh` for the first slice of the window, then `fading` for the
 * remainder, then gone. That's enough to let idle weighting and the
 * renderer taper off gracefully, without a polling loop recomputing a
 * decay curve every frame for something nobody is staring at closely
 * enough to notice the difference — see the sprint's Performance
 * section (zero unnecessary re-renders).
 */

/** How long each kind of influence lingers before it's forgotten entirely. */
const MEMORY_DURATIONS_MS: Record<MemoryKind, number> = {
  fed: 100_000,
  played: 85_000,
  petted: 70_000,
  celebrated: 120_000,
}

/** Fraction of the total duration spent "fresh" before tapering to "fading". */
const FADE_START_RATIO = 0.55

/**
 * Behavioral momentum (Sprint 5.4, Requirement 6): "repeated pleasant
 * interactions gently reinforce comfort... momentum must naturally
 * decay... it must never become a permanent mood system." This is
 * explicitly an EXTENSION of `BehavioralMemory`, not a parallel system
 * — it's the same class, reusing the same "one dominant recent-past
 * class, no polling loop" philosophy as `dominant`/`phase` above, just
 * answering a different question: not "what was the *last* thing that
 * happened" but "how much has *comfortably built up* lately."
 *
 * Deliberately NOT modeled with its own timers. `dominant` needs
 * discrete fresh/fading *transitions* to publish (a renderer has to be
 * told when to change), but momentum only ever needs to be *read* at
 * moments the engine already publishes for other reasons (an
 * interaction, an idle pick) — so it's stored as (value, timestamp)
 * and decayed lazily with a simple exponential half-life at read time.
 * Zero extra timers, zero extra listeners, and by construction it can
 * never get "stuck" at a high value: every read is already decayed.
 */
const MOMENTUM_INCREMENT = 0.18
const MOMENTUM_DECAY_HALFLIFE_MS = 45_000

export class BehavioralMemory {
  private kind: MemoryKind | null = null
  private phase: 'fresh' | 'fading' = 'fresh'
  private fadeTimer: ReturnType<typeof setTimeout> | undefined
  private expireTimer: ReturnType<typeof setTimeout> | undefined
  private onChange: () => void

  /** Raw momentum value as of `momentumUpdatedAt`; see `comfort` getter. */
  private momentumValue = 0
  private momentumUpdatedAt = Date.now()

  constructor(onChange: () => void) {
    this.onChange = onChange
  }

  /**
   * Record that something just happened. Always wins over whatever
   * influence was active before — a fresh interaction is, definitionally,
   * the most recent one, so it replaces rather than blends.
   *
   * `boost` (Sprint 6.0, optional, default 1): a plain multiplier on how
   * much this specific occurrence grows momentum by. `BehavioralMemory`
   * itself stays completely unaware of WHY a caller might pass something
   * other than 1 — the engine is the one that knows about
   * `RoutineFamiliarity` and decides to pass a slightly larger value
   * when an interaction felt like a recognized routine. This keeps the
   * two modules composed, never merged: this class gained one generic
   * parameter, not a dependency on another behavioral signal.
   */
  record(kind: MemoryKind, boost = 1): void {
    clearTimeout(this.fadeTimer)
    clearTimeout(this.expireTimer)

    this.kind = kind
    this.phase = 'fresh'
    const duration = MEMORY_DURATIONS_MS[kind]

    this.fadeTimer = setTimeout(() => {
      this.phase = 'fading'
      this.onChange()
    }, duration * FADE_START_RATIO)

    this.expireTimer = setTimeout(() => {
      this.kind = null
      this.onChange()
    }, duration)

    // Momentum (Requirement 6): nudge comfort up from wherever it's
    // already decayed to, capped at 1 — a burst of interactions builds
    // it faster than it decays, but it can never overflow into
    // anything permanent.
    this.momentumValue = Math.min(1, this.currentMomentum() + MOMENTUM_INCREMENT * boost)
    this.momentumUpdatedAt = Date.now()

    this.onChange()
  }

  /** The current dominant influence, or null once it's fully decayed. */
  get dominant(): AfterglowState | null {
    return this.kind ? { kind: this.kind, phase: this.phase } : null
  }

  /**
   * Accumulated comfort from repeated pleasant interactions, 0..1,
   * continuously and lazily decayed (Requirement 6). Never read as a
   * gate — only ever a gentle multiplier on idle-behavior weights and
   * renderer softness, same contract as `dominant`.
   */
  get comfort(): number {
    return this.currentMomentum()
  }

  dispose(): void {
    clearTimeout(this.fadeTimer)
    clearTimeout(this.expireTimer)
    this.kind = null
  }

  private currentMomentum(): number {
    const elapsed = Date.now() - this.momentumUpdatedAt
    const decay = Math.pow(0.5, elapsed / MOMENTUM_DECAY_HALFLIFE_MS)
    return this.momentumValue * decay
  }
}
