import type { PresenceStage, RoomPresenceSnapshot } from '../types'

/**
 * RoomPresence — Sprint 5.4.
 *
 * Sits *beside* `BehavioralMemory`, not inside it: memory tracks "what
 * just happened" (a single fed/played/petted/celebrated influence);
 * this tracks "how has the *rhythm* of the session felt lately" —
 * quiet-time recognition (Requirement 2) and active-session
 * recognition (Requirement 3), combined into "interaction rhythm"
 * (Requirement 4). Neither replaces the other; the engine composes
 * both, exactly the pattern `BehavioralMemory` itself already set.
 *
 * Two independent signals:
 *
 *  - `stage` — a small state machine over elapsed time since the last
 *    interaction: `active` → `settled` → `quiet` → `deep-quiet`. Modeled
 *    the same way as `BehavioralMemory`'s fresh/fading decay: a handful
 *    of scheduled timers, cleared and rescheduled on every interaction,
 *    rather than a polled countdown. "No timers visible" (Requirement
 *    1) refers to UI — internally, bounded, cleared timers are exactly
 *    how `BehavioralMemory` already does this, so it's the established
 *    idiom, not a new one.
 *  - `activityLevel` — a lazy, timer-free 0..1 read of how many
 *    interactions happened in the recent window. Computed on demand
 *    from a trimmed timestamp array rather than incrementing/decaying
 *    counters on their own timers, which keeps this half of the class
 *    entirely allocation-and-timer-free.
 *
 * Both are read together as one `snapshot()` so idle-weighting and the
 * renderer reason about "the room feels quiet" or "the room feels
 * lively" as a single fact, matching the sprint's own "interaction
 * rhythm" framing rather than two separate numbers to reconcile.
 */

/** Time since the last interaction before each stage takes over. */
const STAGE_THRESHOLDS_MS: Record<Exclude<PresenceStage, 'active'>, number> = {
  settled: 20_000,
  quiet: 75_000,
  'deep-quiet': 240_000,
}

/** Window used to compute how "frequent" recent interaction has been. */
const ACTIVITY_WINDOW_MS = 60_000
/** Interactions at/above this count within the window count as "fully active". */
const ACTIVITY_SATURATION_COUNT = 5

export class RoomPresence {
  private stage: PresenceStage = 'active'
  private stageTimers: Array<ReturnType<typeof setTimeout>> = []
  private recentInteractions: number[] = []
  private onChange: () => void

  constructor(onChange: () => void) {
    this.onChange = onChange
  }

  /**
   * Record that an interaction happened. Always snaps the stage back
   * to `active` (the most recent moment is definitionally the most
   * active one) and schedules the same settle → quiet → deep-quiet
   * ladder BehavioralMemory's fresh/fading model uses, just with one
   * extra rung since "gently influence" implies a gradient rather than
   * a single on/off switch.
   */
  recordInteraction(): void {
    const now = Date.now()
    this.recentInteractions.push(now)
    this.trimActivityWindow(now)

    this.clearStageTimers()
    const wasQuiet = this.stage !== 'active'
    this.stage = 'active'

    this.stageTimers.push(
      setTimeout(() => this.advanceStage('settled'), STAGE_THRESHOLDS_MS.settled),
      setTimeout(() => this.advanceStage('quiet'), STAGE_THRESHOLDS_MS.quiet),
      setTimeout(() => this.advanceStage('deep-quiet'), STAGE_THRESHOLDS_MS['deep-quiet']),
    )

    // Only worth a publish if something actually changed (comfortable
    // sequences of rapid interactions shouldn't force extra renders —
    // this mirrors the "zero unnecessary re-renders" performance rule
    // 5.3B already established for BehavioralMemory).
    if (wasQuiet) this.onChange()
  }

  /** One combined, timer-free read: stage + recent-activity level. */
  snapshot(): Omit<RoomPresenceSnapshot, 'comfort'> {
    this.trimActivityWindow(Date.now())
    const activityLevel = Math.min(1, this.recentInteractions.length / ACTIVITY_SATURATION_COUNT)
    return { stage: this.stage, activityLevel }
  }

  dispose(): void {
    this.clearStageTimers()
    this.recentInteractions = []
  }

  // ------------------------------------------------------------------

  private advanceStage(stage: PresenceStage): void {
    this.stage = stage
    this.onChange()
  }

  private clearStageTimers(): void {
    this.stageTimers.forEach((timer) => clearTimeout(timer))
    this.stageTimers = []
  }

  private trimActivityWindow(now: number): void {
    while (this.recentInteractions.length > 0 && now - this.recentInteractions[0] > ACTIVITY_WINDOW_MS) {
      this.recentInteractions.shift()
    }
  }
}
