import type { TimeOfDay } from '../../environment/types'
import type { CharacterStateId, PresenceStage } from '../types'

/**
 * ObjectAwareness — Sprint 6.2.
 *
 * A fourth independent behavioral module, composed by CharacterEngine
 * exactly like BehavioralMemory, RoomPresence, and RoutineFamiliarity
 * already are — never merged into any of them. Where those three answer
 * questions about *what happened* and *what the rhythm has been*, this
 * one answers a single new question: "is there a room object worth
 * drifting toward right now?"
 *
 * DESIGN
 *
 * Room anchors are named furniture-level positions (window, desk,
 * cushion, bookshelf, plant) each carrying:
 *  - a screen position (x/y, percentages — same coordinate space as
 *    CharacterPosition, layout-independent)
 *  - behavioral tags that map to existing idle behaviors, never new ones
 *  - preferred times of day (from the local clock — no dependency on
 *    EnvironmentEngine, keeping both systems strictly independent)
 *  - a base attraction weight and cooldown period
 *
 * `pickAnchor()` is the entire outward-facing decision API. It takes
 * the behavioral signals already available in CharacterEngine —
 * baseState, presence stage, accumulated comfort, routine level, and
 * (Sprint 6.4) relationship bond strength — and returns the best
 * eligible anchor or null. The engine decides WHEN to ask; this module
 * decides WHICH anchor and WHETHER to go.
 *
 * Sprint 6.4: `pickAnchor()` and `weightFor()` gain a `bondStrength`
 * parameter. A bonded companion drifts more freely to comfort and
 * resting anchors; a new companion is slightly more cautious about
 * wandering. The change is purely additive — all existing callers pass
 * the new argument via the engine, no call-site changes anywhere else.
 *
 * COUPLING POLICY
 *
 * This module imports from `../../environment/types` (for `TimeOfDay`)
 * and from `../types` (for `CharacterStateId` / `PresenceStage`) — both
 * pure type files, no runtime coupling to either engine.
 *
 * RIVE COMPATIBILITY
 *
 * `currentAnchor` in the snapshot is pure semantic vocabulary (a string
 * ID), never a CSS class or animation name. A future Rive rig reads it
 * as a discrete state input alongside the other snapshot fields.
 *
 * PERFORMANCE
 *
 * `pickAnchor` does no allocation beyond two small array operations
 * on a fixed 5-element list and a single `Date` call. Zero timers of
 * its own — cooldowns are stored as timestamps and checked lazily.
 */

export type RoomAnchorId = 'window' | 'desk' | 'cushion' | 'bookshelf' | 'plant'
export type AnchorBehaviorTag = 'resting' | 'observing' | 'curious' | 'studying'

export interface RoomAnchor {
  id: RoomAnchorId
  /**
   * x/y as percentages of the room container — the same coordinate
   * space CharacterPosition already uses, so renderers need no special
   * case for anchor positions.
   */
  position: { x: number; y: number }
  /** Which idle behaviors are appropriate once she arrives. */
  tags: AnchorBehaviorTag[]
  /** Times of day when this anchor is most attractive. */
  preferredTimes: TimeOfDay[]
  /** Base attraction weight before contextual bias. */
  baseWeight: number
  /**
   * Minimum time between visits. Deliberately long — anchor visits
   * should feel like rare, natural moments rather than a scheduled
   * patrol.
   */
  cooldownMs: number
}

export interface ObjectAwarenessSnapshot {
  currentAnchor: RoomAnchorId | null
}

// -----------------------------------------------------------------------
// Room anchor definitions
// -----------------------------------------------------------------------
const ROOM_ANCHORS: RoomAnchor[] = [
  {
    id: 'window',
    position: { x: 22, y: 52 },
    tags: ['observing', 'curious'],
    preferredTimes: ['morning', 'evening'],
    baseWeight: 8,
    cooldownMs: 8 * 60_000,
  },
  {
    id: 'desk',
    position: { x: 72, y: 52 },
    tags: ['studying', 'curious'],
    preferredTimes: ['morning', 'afternoon'],
    baseWeight: 6,
    cooldownMs: 7 * 60_000,
  },
  {
    id: 'cushion',
    position: { x: 40, y: 62 },
    tags: ['resting'],
    preferredTimes: ['evening', 'night'],
    baseWeight: 7,
    cooldownMs: 10 * 60_000,
  },
  {
    id: 'bookshelf',
    position: { x: 78, y: 40 },
    tags: ['curious', 'observing'],
    preferredTimes: ['afternoon'],
    baseWeight: 4,
    cooldownMs: 12 * 60_000,
  },
  {
    id: 'plant',
    position: { x: 18, y: 50 },
    tags: ['curious'],
    preferredTimes: ['morning', 'afternoon'],
    baseWeight: 4,
    cooldownMs: 10 * 60_000,
  },
]

const VISIT_ELIGIBLE_STATES = new Set<CharacterStateId>(['idle'])

function currentTimeOfDay(): TimeOfDay {
  const h = new Date().getHours()
  if (h >= 5 && h < 11) return 'morning'
  if (h >= 11 && h < 17) return 'afternoon'
  if (h >= 17 && h < 20) return 'evening'
  return 'night'
}

function pickWeighted<T>(items: Array<{ item: T; weight: number }>): T | null {
  const total = items.reduce((sum, e) => sum + e.weight, 0)
  if (total <= 0) return null
  let roll = Math.random() * total
  for (const entry of items) {
    roll -= entry.weight
    if (roll <= 0) return entry.item
  }
  return items[items.length - 1].item
}

export class ObjectAwareness {
  private currentAnchorId: RoomAnchorId | null = null
  private cooldowns = new Map<RoomAnchorId, number>()
  private onChange: () => void

  constructor(onChange: () => void) {
    this.onChange = onChange
  }

  /**
   * Return the best eligible room anchor to visit right now, or null.
   *
   * Sprint 6.4: gains a `bondStrength` (0..1) parameter. A bonded
   * companion explores the room more comfortably — comfort and resting
   * anchors become slightly more attractive, all anchors get a small
   * base lift. A 'new' companion (low bond) is slightly more cautious
   * about venturing away from the center.
   */
  pickAnchor(
    baseState: CharacterStateId,
    presenceStage: PresenceStage,
    comfort: number,
    routineLevel: number,
    bondStrength: number,
  ): RoomAnchor | null {
    if (!VISIT_ELIGIBLE_STATES.has(baseState)) return null
    if (presenceStage === 'active') return null

    const now = Date.now()
    const timeOfDay = currentTimeOfDay()

    const eligible = ROOM_ANCHORS.filter((anchor) => {
      const lastVisit = this.cooldowns.get(anchor.id) ?? 0
      return now - lastVisit >= anchor.cooldownMs
    })

    if (eligible.length === 0) return null

    const weighted = eligible.map((anchor) => ({
      item: anchor,
      weight: this.weightFor(anchor, timeOfDay, comfort, routineLevel, bondStrength),
    }))

    return pickWeighted(weighted)
  }

  recordVisit(id: RoomAnchorId): void {
    this.cooldowns.set(id, Date.now())
    this.currentAnchorId = id
    this.onChange()
  }

  clearCurrentAnchor(): void {
    if (this.currentAnchorId !== null) {
      this.currentAnchorId = null
      this.onChange()
    }
  }

  snapshot(): ObjectAwarenessSnapshot {
    return { currentAnchor: this.currentAnchorId }
  }

  dispose(): void {
    this.cooldowns.clear()
    this.currentAnchorId = null
  }

  /**
   * Return a specific anchor by ID. Used by CharacterEngine to resolve a
   * DailyRoutine anchor intent into a full `RoomAnchor` object for
   * `buildAnchorVisitBehavior()`. Read-only — no state change.
   */
  getAnchor(id: RoomAnchorId): RoomAnchor | null {
    return ROOM_ANCHORS.find((a) => a.id === id) ?? null
  }

  // ------------------------------------------------------------------

  /**
   * Compute contextual weight for a single anchor. Every factor is a
   * multiplicative nudge on the anchor's base weight — the same
   * "bias, never force" contract as every other weighting function.
   *
   * Sprint 6.4 adds `bondStrength`:
   *  - All anchors get a small base lift when bonded (she's generally
   *    more willing to wander near a player she trusts).
   *  - Resting anchors get an extra boost (she's comfortable settling).
   *  - Curious/observing anchors are slightly more restrained for a
   *    new companion (she doesn't yet explore as freely).
   *
   * The bond multipliers are smaller than the time-of-day and comfort
   * terms on purpose — bond is a long-timescale signal and should feel
   * like a subtle, cumulative shift, not a sudden mode-change.
   */
  private weightFor(
    anchor: RoomAnchor,
    timeOfDay: TimeOfDay,
    comfort: number,
    routineLevel: number,
    bondStrength: number,
  ): number {
    let weight = anchor.baseWeight

    // Time preference
    if (anchor.preferredTimes.includes(timeOfDay)) {
      weight *= 1.8
    } else {
      weight *= 0.55
    }

    // Comfort: cozy Mochi gravitates toward resting/warm spots
    if (comfort > 0.3) {
      if (anchor.tags.includes('resting')) weight *= 1 + 0.6 * comfort
      if (anchor.tags.includes('curious')) weight *= 1 - 0.2 * comfort
    }

    // Routine familiarity: recognized study flow → desk and cushion
    if (routineLevel > 0.2) {
      if (anchor.id === 'desk')    weight *= 1 + 0.4 * routineLevel
      if (anchor.id === 'cushion') weight *= 1 + 0.3 * routineLevel
    }

    // Relationship bond (Sprint 6.4): bonded Mochi moves through the
    // room more comfortably. All anchors get a gentle lift; resting
    // spots get an extra nudge (she trusts the space enough to settle).
    // Curious/exploring anchors are gently dampened for a new companion
    // — she doesn't wander as freely before trust is established.
    if (bondStrength > 0) {
      weight *= 1 + 0.25 * bondStrength             // base comfort lift
      if (anchor.tags.includes('resting'))   weight *= 1 + 0.2 * bondStrength
      if (anchor.tags.includes('observing')) weight *= 1 + 0.1 * bondStrength
    }
    if (bondStrength < 0.3) {
      // New companion: curious exploration is slightly tempered
      if (anchor.tags.includes('curious')) weight *= 0.7 + bondStrength
    }

    return Math.max(0, weight)
  }
}
