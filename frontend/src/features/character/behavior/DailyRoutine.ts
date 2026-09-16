import type { TimeOfDay } from '../../environment/types'
import type { PresenceStage } from '../types'

/**
 * DailyRoutine — Sprint 6.5.
 *
 * A seventh independent behavioral module, composed by CharacterEngine
 * identically to the preceding six. Where those modules answer
 * "what just happened" (BehavioralMemory), "how lively has the session
 * been" (RoomPresence), "does this feel like a routine"
 * (RoutineFamiliarity), "is there a room object to visit"
 * (ObjectAwareness), "how does she move" (NavigationController), and
 * "how deep is the connection" (RelationshipBond), this module answers
 * a single new question:
 *
 *   "What quiet autonomous activity would Mochi naturally initiate
 *    right now, entirely on her own, without any player prompt?"
 *
 * ──────────────────────────────────────────────────────────────────────
 * DESIGN INTENT
 *
 * Mochi should feel like she's living her own gentle daily life. When
 * the player is simply watching — not interacting — the room should
 * still feel inhabited. Activities emerge naturally from the intersection
 * of multiple environmental signals already tracked by other modules:
 *
 *  • Time of day     → morning: window-watching; evening: resting;
 *                       night: quiet thinking
 *  • Presence stage  → deep-quiet: rest/observation; active: player-watching
 *  • Comfort         → high: favourite resting spots; low: curiosity
 *  • Bond strength   → stronger bond: initiates more freely;
 *                       new companion: more reserved about wandering
 *  • Routine level   → familiar flow: more settled, predictable drifts
 *  • Recent afterglow → petted: content observation; fed: resting;
 *                        played: brief energy, then settle
 *
 * ──────────────────────────────────────────────────────────────────────
 * ARCHITECTURE
 *
 * DailyRoutine does NOT schedule behaviors directly. It exposes a
 * single decision method — `pickActivity()` — that returns a
 * `DailyActivity` or null. CharacterEngine owns the scheduling timer
 * and calls `pickActivity()` at appropriate, jittered intervals.
 * Existing behavior systems (BehaviorController, ObjectAwareness,
 * NavigationController) execute the resulting intention.
 *
 * This keeps CharacterEngine as the sole composer and scheduler, and
 * keeps DailyRoutine as a pure decision module — the same "bias, never
 * force" contract that every preceding module follows. CharacterEngine
 * is always the decision authority; DailyRoutine only proposes.
 *
 * ──────────────────────────────────────────────────────────────────────
 * ACTIVITIES
 *
 * All activities are expressed in the existing behavioral vocabulary:
 * anchor IDs and micro-behavior IDs already present in the engine. No
 * new animations, overlays, states, or gameplay mechanics are
 * introduced — Sprint 6.5 is entirely additive behavioral configuration.
 *
 *  watching-window  → anchor visit: 'window'
 *  resting          → anchor visit: 'cushion' or 'bookshelf' (weighted)
 *  exploring        → anchor visit: 'plant' or 'bookshelf' (context-weighted)
 *  observing-player → micro-behavior: 'observing-room'
 *  quiet-thinking   → micro-behavior: 'ambient-thought'
 *  stretching       → micro-behavior: 'stretching'
 *  desk-moment      → anchor visit: 'desk'
 *
 * ──────────────────────────────────────────────────────────────────────
 * COOLDOWN DESIGN
 *
 * Each activity has a per-kind cooldown (6–15 minutes). A global
 * cooldown (2 minutes minimum between any two autonomous initiations)
 * prevents back-to-back activities from feeling scripted. Combined with
 * the existing per-anchor cooldowns in ObjectAwareness, a typical
 * 30-minute passive session will produce 3–6 natural moments — rare
 * enough to feel organic, present enough to make the room feel alive.
 *
 * ──────────────────────────────────────────────────────────────────────
 * PRIORITY & INTERRUPTION
 *
 * Daily activities are submitted to BehaviorController at priority 1 —
 * identical to idle micro-behaviors — so all existing interruption rules
 * apply unchanged. Any reaction (eat, play, pet, celebrate; priority
 * 10–30) immediately preempts them. A study-session start (base-state
 * change to 'studying') gates `tryInitiateDailyActivity` at the engine
 * level, so no daily activity is ever submitted while studying.
 *
 * ──────────────────────────────────────────────────────────────────────
 * PERFORMANCE
 *
 * Zero polling loops. One jittered `setTimeout` chain in CharacterEngine
 * (not this module) fires `pickActivity()` every ~3 minutes ±25%.
 * `pickActivity()` itself does no allocation beyond small array
 * operations on a fixed 7-element candidate list and two `Date.now()`
 * calls. Zero timers of its own — cooldowns are stored as timestamps and
 * checked lazily, the same idiom as BehavioralMemory and ObjectAwareness.
 *
 * ──────────────────────────────────────────────────────────────────────
 * REDUCED-MOTION
 *
 * Movement-based activities (watching-window, resting, exploring,
 * desk-moment) are excluded when `reducedMotion` is true. Only
 * non-movement activities (observing-player, quiet-thinking, stretching)
 * remain eligible, so the system degrades gracefully while still
 * providing a sense of ambient presence.
 *
 * ──────────────────────────────────────────────────────────────────────
 * RIVE COMPATIBILITY
 *
 * `currentActivity` in the snapshot is pure semantic vocabulary — a
 * string enum ID, never a CSS class or animation name. A future Rive
 * rig reads it as a discrete state input alongside the other snapshot
 * fields with no changes required here.
 *
 * ──────────────────────────────────────────────────────────────────────
 * COUPLING POLICY
 *
 * Imports only from `../../environment/types` (for `TimeOfDay`) and
 * `../types` (for `PresenceStage`) — both pure type files with zero
 * runtime coupling. Knows nothing about CharacterEngine internals,
 * BehaviorController, NavigationController, or any rendering technology.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Activity vocabulary
// ─────────────────────────────────────────────────────────────────────────────

export type DailyActivityId =
  | 'watching-window'
  | 'resting'
  | 'exploring'
  | 'observing-player'
  | 'quiet-thinking'
  | 'stretching'
  | 'desk-moment'

/**
 * A resolved activity ready for CharacterEngine to execute. The engine
 * maps anchor IDs to ObjectAwareness.getAnchor() and micro-behavior IDs
 * to buildIdleBehavior() — all existing machinery, no new paths.
 */
export interface DailyActivity {
  id: DailyActivityId
  /** Present for movement-based activities; CharacterEngine visits this anchor. */
  anchorId?: 'window' | 'desk' | 'cushion' | 'bookshelf' | 'plant'
  /** Present for non-movement activities; CharacterEngine runs this micro-behavior. */
  microBehaviorId?: 'observing-room' | 'ambient-thought' | 'stretching' | 'looking-around'
}

export interface DailyRoutineSnapshot {
  /**
   * The autonomous activity Mochi is currently doing, or null.
   * A semantic signal for renderers — never shown as a label or UI element.
   * RIVE: maps to a discrete string input.
   */
  currentActivity: DailyActivityId | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity specs
// ─────────────────────────────────────────────────────────────────────────────

interface ActivitySpec {
  id: DailyActivityId
  /** Base weight before contextual bias. Higher = more probable all else equal. */
  baseWeight: number
  /** Per-kind cooldown. Deliberately long: 2–4 occurrences per hour at most. */
  cooldownMs: number
  /** Times of day when this activity is most natural. */
  preferredTimes: TimeOfDay[]
  /** Presence stages where this is appropriate. */
  preferredStages: PresenceStage[]
  /** Movement activities are skipped when reducedMotion is true. */
  requiresMovement: boolean
}

const ACTIVITY_SPECS: ActivitySpec[] = [
  {
    id: 'watching-window',
    baseWeight: 16,
    cooldownMs: 9 * 60_000,
    preferredTimes: ['morning', 'evening'],
    preferredStages: ['settled', 'quiet', 'deep-quiet'],
    requiresMovement: true,
  },
  {
    id: 'resting',
    baseWeight: 14,
    cooldownMs: 10 * 60_000,
    preferredTimes: ['afternoon', 'evening', 'night'],
    preferredStages: ['quiet', 'deep-quiet'],
    requiresMovement: true,
  },
  {
    id: 'exploring',
    baseWeight: 10,
    cooldownMs: 12 * 60_000,
    preferredTimes: ['morning', 'afternoon'],
    preferredStages: ['settled', 'quiet'],
    requiresMovement: true,
  },
  {
    id: 'observing-player',
    baseWeight: 12,
    cooldownMs: 7 * 60_000,
    preferredTimes: ['morning', 'afternoon', 'evening'],
    preferredStages: ['active', 'settled'],
    requiresMovement: false,
  },
  {
    id: 'quiet-thinking',
    baseWeight: 10,
    cooldownMs: 6 * 60_000,
    preferredTimes: ['evening', 'night'],
    preferredStages: ['quiet', 'deep-quiet'],
    requiresMovement: false,
  },
  {
    id: 'stretching',
    baseWeight: 8,
    cooldownMs: 8 * 60_000,
    preferredTimes: ['morning', 'afternoon', 'evening', 'night'],
    preferredStages: ['settled', 'quiet'],
    requiresMovement: false,
  },
  {
    id: 'desk-moment',
    baseWeight: 6,
    cooldownMs: 15 * 60_000,
    preferredTimes: ['morning', 'afternoon'],
    preferredStages: ['settled', 'quiet', 'deep-quiet'],
    requiresMovement: true,
  },
]

/** Minimum time between any two autonomous activity initiations. */
const GLOBAL_COOLDOWN_MS = 2 * 60_000

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function currentTimeOfDay(): TimeOfDay {
  const h = new Date().getHours()
  if (h >= 5 && h < 11) return 'morning'
  if (h >= 11 && h < 17) return 'afternoon'
  if (h >= 17 && h < 20) return 'evening'
  return 'night'
}

function pickWeighted<T>(entries: Array<{ item: T; weight: number }>): T | null {
  const eligible = entries.filter((e) => e.weight > 0)
  if (eligible.length === 0) return null
  const total = eligible.reduce((sum, e) => sum + e.weight, 0)
  let roll = Math.random() * total
  for (const entry of eligible) {
    roll -= entry.weight
    if (roll <= 0) return entry.item
  }
  return eligible[eligible.length - 1].item
}

// ─────────────────────────────────────────────────────────────────────────────
// DailyRoutine
// ─────────────────────────────────────────────────────────────────────────────

export class DailyRoutine {
  private activityCooldowns = new Map<DailyActivityId, number>()
  private lastActivityAt = 0
  private currentActivityId: DailyActivityId | null = null
  private onChange: () => void

  constructor(onChange: () => void) {
    this.onChange = onChange
  }

  /**
   * Attempt to pick a daily activity for Mochi to initiate autonomously.
   * Returns null when no activity is eligible (global/per-kind cooldowns,
   * presence-stage mismatch, reduced-motion guard, or not in idle state).
   *
   * Called exclusively by CharacterEngine on a jittered periodic timer;
   * this module never schedules its own work.
   */
  pickActivity(opts: {
    baseState: string
    presenceStage: PresenceStage
    comfort: number
    routineLevel: number
    bondStrength: number
    reducedMotion: boolean
    afterglowKind: string | null
  }): DailyActivity | null {
    const now = Date.now()

    // Gate: only initiate when Mochi is idle.
    if (opts.baseState !== 'idle') return null

    // Gate: active presence means the player is engaging — don't interrupt.
    if (opts.presenceStage === 'active') return null

    // Gate: global cooldown prevents back-to-back autonomous activities.
    if (now - this.lastActivityAt < GLOBAL_COOLDOWN_MS) return null

    const timeOfDay = currentTimeOfDay()

    const candidates = ACTIVITY_SPECS.map((spec) => {
      // Per-kind cooldown.
      const lastDone = this.activityCooldowns.get(spec.id) ?? 0
      if (now - lastDone < spec.cooldownMs) return { item: spec, weight: 0 }

      // Presence stage must be in the preferred set.
      if (!spec.preferredStages.includes(opts.presenceStage)) return { item: spec, weight: 0 }

      // Reduced-motion: skip anything that involves physical movement.
      if (opts.reducedMotion && spec.requiresMovement) return { item: spec, weight: 0 }

      let weight = spec.baseWeight

      // ── Time of day preference ─────────────────────────────────────────────
      weight *= spec.preferredTimes.includes(timeOfDay) ? 1.8 : 0.4

      // ── Presence stage depth ──────────────────────────────────────────────
      // Deeper quiet nudges toward restful, inward activities.
      const quietness =
        opts.presenceStage === 'deep-quiet' ? 1 : opts.presenceStage === 'quiet' ? 0.55 : 0
      if (quietness > 0) {
        if (spec.id === 'resting')          weight *= 1 + 0.7 * quietness
        if (spec.id === 'quiet-thinking')   weight *= 1 + 0.6 * quietness
        if (spec.id === 'watching-window')  weight *= 1 + 0.3 * quietness
        if (spec.id === 'exploring')        weight *= 1 - 0.5 * quietness
        if (spec.id === 'observing-player') weight *= 1 - 0.4 * quietness
      }

      // ── Comfort ───────────────────────────────────────────────────────────
      // High comfort → favourite resting spots; low → curiosity-led wandering.
      if (opts.comfort > 0.3) {
        if (spec.id === 'resting')        weight *= 1 + 0.5 * opts.comfort
        if (spec.id === 'quiet-thinking') weight *= 1 + 0.3 * opts.comfort
        if (spec.id === 'exploring')      weight *= 1 - 0.3 * opts.comfort
      }

      // ── Routine familiarity ───────────────────────────────────────────────
      // A familiar session flow biases toward settled, predictable drifts.
      if (opts.routineLevel > 0) {
        if (spec.id === 'desk-moment')    weight *= 1 + 0.4 * opts.routineLevel
        if (spec.id === 'quiet-thinking') weight *= 1 + 0.3 * opts.routineLevel
        if (spec.id === 'exploring')      weight *= 1 - 0.2 * opts.routineLevel
      }

      // ── Relationship bond ─────────────────────────────────────────────────
      // A bonded companion initiates more freely; a new one is more reserved.
      // Bond multipliers are smaller than time/comfort terms by design —
      // bond is a background signal, slow and cumulative, not a mode-flip.
      if (opts.bondStrength > 0) {
        weight *= 1 + 0.3 * opts.bondStrength  // general confidence lift
        if (spec.id === 'observing-player') weight *= 1 + 0.25 * opts.bondStrength
        if (spec.id === 'resting')          weight *= 1 + 0.2 * opts.bondStrength
        if (spec.id === 'watching-window')  weight *= 1 + 0.1 * opts.bondStrength
      }
      if (opts.bondStrength < 0.3) {
        // New companion: more reserved about initiating unprompted activities.
        if (spec.id === 'exploring')        weight *= 0.7 + opts.bondStrength
        if (spec.id === 'observing-player') weight *= 0.6 + opts.bondStrength * 2
      }

      // ── Afterglow ─────────────────────────────────────────────────────────
      // Recent interactions color which activity feels natural right now.
      if (opts.afterglowKind === 'petted') {
        if (spec.id === 'observing-player') weight *= 1.5  // happy to be near
        if (spec.id === 'resting')          weight *= 1.3  // settled after affection
        if (spec.id === 'exploring')        weight *= 0.7  // content, not restless
      }
      if (opts.afterglowKind === 'fed') {
        if (spec.id === 'resting')   weight *= 1.6  // content and full
        if (spec.id === 'exploring') weight *= 0.6
      }
      if (opts.afterglowKind === 'played') {
        if (spec.id === 'stretching') weight *= 1.4  // worked up a little energy
        if (spec.id === 'resting')    weight *= 0.8  // not quite ready to settle
      }

      return { item: spec, weight: Math.max(0, weight) }
    })

    const picked = pickWeighted(candidates)
    if (!picked) return null

    // Record the decision.
    this.lastActivityAt = now
    this.activityCooldowns.set(picked.id, now)

    return this.resolveActivity(picked.id, opts.comfort, timeOfDay)
  }

  /** Called by CharacterEngine when the activity begins executing. */
  setCurrentActivity(id: DailyActivityId | null): void {
    if (this.currentActivityId === id) return
    this.currentActivityId = id
    this.onChange()
  }

  snapshot(): DailyRoutineSnapshot {
    return { currentActivity: this.currentActivityId }
  }

  dispose(): void {
    this.activityCooldowns.clear()
    this.currentActivityId = null
  }

  // ── Private ────────────────────────────────────────────────────────────────

  /**
   * Resolve a picked activity kind into a concrete `DailyActivity` with
   * anchor or micro-behavior details. This is the only place that maps
   * high-level intentions ("resting") to specific existing vocabulary
   * ("cushion anchor" or "bookshelf anchor"). All decisions are contextual
   * so the same intention produces slightly different outcomes over time.
   */
  private resolveActivity(
    id: DailyActivityId,
    comfort: number,
    timeOfDay: TimeOfDay,
  ): DailyActivity {
    switch (id) {
      case 'watching-window':
        return { id, anchorId: 'window' }

      case 'resting':
        // Comfort-weighted: higher comfort → cushion (softer, more deliberate);
        // lower comfort → wherever she lands (cushion or bookshelf equally).
        return {
          id,
          anchorId:
            comfort > 0.4 ? 'cushion' : Math.random() < 0.6 ? 'cushion' : 'bookshelf',
        }

      case 'exploring':
        // Wanders to curiosity anchors, not the desk (that's 'desk-moment').
        // Morning: likely to head toward the light or greenery.
        // Afternoon: bookshelf draws her attention.
        return {
          id,
          anchorId:
            timeOfDay === 'morning'
              ? Math.random() < 0.55 ? 'window' : 'plant'
              : Math.random() < 0.55 ? 'bookshelf' : 'plant',
        }

      case 'observing-player':
        return { id, microBehaviorId: 'observing-room' }

      case 'quiet-thinking':
        return { id, microBehaviorId: 'ambient-thought' }

      case 'stretching':
        return { id, microBehaviorId: 'stretching' }

      case 'desk-moment':
        return { id, anchorId: 'desk' }
    }
  }
}
