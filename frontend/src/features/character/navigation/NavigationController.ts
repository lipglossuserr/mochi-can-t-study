import type { CharacterPosition } from '../types'

/**
 * NavigationController — Sprint 6.3.
 *
 * An independent movement-execution module. CharacterEngine issues a
 * movement intent (`beginMoveTo`); this class owns everything that
 * happens after that: the tick loop, the interpolation, the direction
 * label, the arriving settle pause, and the callback chain that lets
 * the engine know when she's actually there.
 *
 * What this module does NOT do:
 *  - Choose WHERE to move (that's ObjectAwareness / CharacterEngine)
 *  - Decide WHEN to move (that's the idle-behavior system)
 *  - Draw anything (that's the renderer)
 *  - Know about Rive, SVG, React, or any rendering technology
 *
 * MOVEMENT MODEL
 *
 * Each movement has two phases:
 *
 *   walking  — the tick loop interpolates position from `from` to `to`
 *              using a cosine ease-in/out curve. At 20fps the motion is
 *              smooth for the slow, pet-like speeds this feature uses.
 *
 *   arriving — the tick stops, she's at the destination. Lasts for
 *              ARRIVING_PAUSE_MS before transitioning to stationary.
 *              `onArrived` fires the instant walking ends; `onSettled`
 *              fires after the arriving pause. Callers use `onSettled`
 *              to start dwell behaviors, so the brief pause reads as
 *              "she just arrived" rather than "she instantly reacted."
 *
 * INTERRUPTION
 *
 * `interrupt()` stops the tick immediately and clears position to null
 * (default layout). Called when reactions (eat, play, pet, celebrate)
 * preempt movement — she snaps to default position while the reaction
 * overlay plays on top, the same way the state machine's overlay system
 * already handles any other competing animation.
 *
 * RIVE COMPATIBILITY
 *
 * `MovementSnapshot` is pure semantic vocabulary — `state`, `direction`,
 * `progress` are all renderer-agnostic signals. A future Rive rig reads
 * them as discrete or continuous state inputs with no changes here:
 *  - `state: 'walking'` → trigger walk cycle
 *  - `direction: 'left'`→ flip/mirror rig or use left-walk blend
 *  - `progress: 0..1`  → scrub a secondary blend tree if desired
 *
 * PERFORMANCE
 *
 * The setInterval only runs while actually moving. A 20fps tick for a
 * 1–3 second movement adds ~20–60 publishes to the engine's listener
 * set per visit — negligible for a React app using useSyncExternalStore.
 * Idle periods cost nothing. No rAF is used (avoids tab-visibility
 * edge cases; movement at 20fps is indistinguishable from 60fps at the
 * slow speeds this feature operates at).
 */

export type MovementState = 'stationary' | 'walking' | 'arriving'
export type MovementDirection = 'left' | 'right'

export interface MovementSnapshot {
  /**
   * Current movement phase. Renderers use `walking` to switch to a
   * walking expression/pose; `arriving` for a brief settle; `stationary`
   * for all normal idle/reaction behavior.
   */
  state: MovementState
  /**
   * Current interpolated position during movement, or null when
   * stationary at the default layout center. Same coordinate space
   * as `CharacterPosition` (0–100 percentages of the container).
   * The `anchor` field carries the destination's semantic ID while
   * walking — useful for Rive inputs and future analytics.
   */
  position: CharacterPosition | null
  /**
   * Which way she's facing during movement. Null when stationary.
   * Renderers flip the sprite; Rive rigs switch direction blend tracks.
   */
  direction: MovementDirection | null
  /**
   * 0..1 — how far along the current movement she is (eased, not linear).
   * 0 when stationary, 1 on arrival/arriving. Available for secondary
   * motion (gait cycle blend, bounce amplitude) in future renderers.
   */
  progress: number
}

/**
 * The room's default layout center — where Mochi is when `position` is
 * null. Defined here so the engine and behavior layer can reference it
 * without importing a separate config file. Matches the room scene's
 * CSS centering: 50% horizontally, 65% down (below the window, above
 * the rug foreground). Exported so CharacterEngine's anchor-visit
 * behavior can use it as the return-home destination.
 */
export const HOME_POSITION: { x: number; y: number } = { x: 50, y: 65 }

/** Tick interval during movement. 20fps is smooth at slow pet speeds. */
const TICK_MS = 50

/**
 * How long the `arriving` state lasts before transitioning to
 * `stationary`. The brief asks for "pause briefly after arriving before
 * starting the selected idle behavior" — this pause is that beat.
 * Short enough not to feel like a freeze; long enough to read as
 * "she just got here."
 */
export const ARRIVING_PAUSE_MS = 400

/**
 * Duration parameters for movement. Distance is euclidean in the
 * 0–100 percentage coordinate space (where 100 units ≈ full room width).
 *
 *   SCALE_MS_PER_UNIT × distance → raw duration
 *   Clamped to [MIN_MS, MAX_MS].
 *
 * At these values:
 *   - Short hop  (~10 units) → MIN_MS = 1100ms
 *   - Room cross (~60 units) → 1920ms (~2 seconds)
 *   - Diagonal   (~85 units) → 2720ms, capped at MAX_MS if needed
 *
 * "Keep movement slow, subtle, and pet-like" — these durations land
 * in the same range as a cat sauntering across a room, not dashing.
 */
const SCALE_MS_PER_UNIT = 32
const MIN_DURATION_MS = 1100
const MAX_DURATION_MS = 3200

/** Cosine ease-in/out — same curve EnvironmentEngine already uses. */
function easeInOut(t: number): number {
  return (1 - Math.cos(t * Math.PI)) / 2
}

/** Euclidean distance in the 0–100 percentage coordinate space. */
function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}

/**
 * Compute the movement duration for a given from → to pair. Exported
 * so CharacterEngine's anchor-visit behavior can use it to compute a
 * tight `durationMs` for the behavior slot rather than using a fixed
 * worst-case estimate.
 */
export function computeMovementDuration(
  from: { x: number; y: number },
  to: { x: number; y: number },
): number {
  return Math.max(MIN_DURATION_MS, Math.min(MAX_DURATION_MS, distance(from, to) * SCALE_MS_PER_UNIT))
}

interface MoveOptions {
  /**
   * Fires the instant the walking phase ends (position has snapped to
   * destination, state transitions to `arriving`). Use for time-critical
   * responses that shouldn't wait for the settle pause — e.g. recording
   * that she's "at" the anchor before the pause starts.
   */
  onArrived?: () => void
  /**
   * Fires after `ARRIVING_PAUSE_MS` once the arriving state ends and
   * state transitions to `stationary`. This is the right hook for
   * starting a dwell behavior — the pause reads as natural settling.
   */
  onSettled?: () => void
}

export class NavigationController {
  private movState: MovementState = 'stationary'
  private fromPos: { x: number; y: number } = HOME_POSITION
  private toPos: CharacterPosition = HOME_POSITION
  private startedAt = 0
  private durationMs = 0
  /** Interpolated position during movement, null when stationary. */
  private currentX: number | null = null
  private currentY: number | null = null
  private dir: MovementDirection | null = null
  private tickId: ReturnType<typeof setInterval> | undefined
  private settleTimer: ReturnType<typeof setTimeout> | undefined
  private onArrivedCb: (() => void) | undefined
  private onSettledCb: (() => void) | undefined
  private onChange: () => void
  private disposed = false

  constructor(onChange: () => void) {
    this.onChange = onChange
  }

  /**
   * Begin moving from `from` to `to`. If a movement is already in
   * progress it is interrupted immediately and this one starts fresh.
   * `from` defaults to `HOME_POSITION` when null.
   *
   * `onArrived` fires when walking ends; `onSettled` fires after the
   * arriving pause. Only use `onSettled` for dwell-behavior scheduling
   * to get the natural settling beat for free.
   */
  beginMoveTo(
    from: { x: number; y: number } | null,
    to: CharacterPosition,
    opts?: MoveOptions,
  ): void {
    if (this.disposed) return
    this.stopAll()

    const resolvedFrom = from ?? HOME_POSITION
    this.fromPos = resolvedFrom
    this.toPos = to
    this.startedAt = Date.now()
    this.durationMs = computeMovementDuration(resolvedFrom, to)
    // Moving right when destination is to the right of origin (or exactly
    // horizontal — bias toward right to avoid direction flicker on tiny moves).
    this.dir = to.x < resolvedFrom.x ? 'left' : 'right'
    this.movState = 'walking'
    this.currentX = resolvedFrom.x
    this.currentY = resolvedFrom.y
    this.onArrivedCb = opts?.onArrived
    this.onSettledCb = opts?.onSettled

    this.tickId = setInterval(() => this.tick(), TICK_MS)
    this.onChange()
  }

  /**
   * Interrupt movement immediately, clearing position to null.
   *
   * Called when reactions (eat, play, pet, celebrate) preempt an
   * in-progress anchor visit. Callbacks are discarded; the renderer
   * reverts to the default centered layout position as though the
   * visit never started.
   *
   * Idempotent — safe to call from cleanup handlers that may fire
   * more than once (e.g. behavior cleanup + reaction handler).
   */
  interrupt(): void {
    this.stopAll()
    this.movState = 'stationary'
    this.currentX = null
    this.currentY = null
    this.dir = null
    if (!this.disposed) this.onChange()
  }

  /**
   * Set position back to null (default layout) without interrupting a
   * movement in progress. Use at the END of a return-home sequence —
   * she's arrived home, the navigation is done, but the explicit
   * position coordinate should now give way to the CSS layout default.
   *
   * Only fires `onChange` if position was actually non-null.
   */
  clearPosition(): void {
    if (this.currentX !== null || this.currentY !== null) {
      this.currentX = null
      this.currentY = null
      if (!this.disposed) this.onChange()
    }
  }

  /**
   * Current interpolated position, or null if stationary at the default
   * layout center. Used by CharacterEngine to know WHERE to begin the
   * next movement from, so consecutive anchor visits start from the
   * correct coordinates rather than always from HOME_POSITION.
   */
  currentPosition(): { x: number; y: number } | null {
    if (this.currentX === null || this.currentY === null) return null
    return { x: this.currentX, y: this.currentY }
  }

  snapshot(): MovementSnapshot {
    const pos =
      this.currentX !== null && this.currentY !== null
        ? { x: this.currentX, y: this.currentY, anchor: this.toPos.anchor }
        : null

    const progress =
      this.movState === 'stationary'
        ? 0
        : this.movState === 'arriving'
          ? 1
          : Math.min(1, (Date.now() - this.startedAt) / this.durationMs)

    return {
      state: this.movState,
      position: pos,
      direction: this.dir,
      progress,
    }
  }

  dispose(): void {
    this.disposed = true
    this.stopAll()
  }

  // ------------------------------------------------------------------

  private tick(): void {
    if (this.disposed || this.movState !== 'walking') {
      this.stopTick()
      return
    }

    const elapsed = Date.now() - this.startedAt
    const t = Math.min(1, elapsed / this.durationMs)
    const eased = easeInOut(t)

    this.currentX = this.fromPos.x + (this.toPos.x - this.fromPos.x) * eased
    this.currentY = this.fromPos.y + (this.toPos.y - this.fromPos.y) * eased

    if (t >= 1) {
      // Snap to exact destination — no floating-point drift.
      this.currentX = this.toPos.x
      this.currentY = this.toPos.y
      this.movState = 'arriving'
      this.stopTick()
      this.onChange()

      // Capture and clear callbacks before firing so they can safely
      // call beginMoveTo again without re-triggering stale handlers.
      const arrived = this.onArrivedCb
      const settled = this.onSettledCb
      this.onArrivedCb = undefined
      this.onSettledCb = undefined

      arrived?.()

      // Transition out of 'arriving' after the settle pause.
      this.settleTimer = setTimeout(() => {
        if (!this.disposed && this.movState === 'arriving') {
          this.movState = 'stationary'
          this.onChange()
          settled?.()
        }
      }, ARRIVING_PAUSE_MS)
    } else {
      this.onChange()
    }
  }

  private stopTick(): void {
    if (this.tickId !== undefined) {
      clearInterval(this.tickId)
      this.tickId = undefined
    }
  }

  /** Stop tick + cancel settle timer + discard pending callbacks. */
  private stopAll(): void {
    this.stopTick()
    clearTimeout(this.settleTimer)
    this.settleTimer = undefined
    this.onArrivedCb = undefined
    this.onSettledCb = undefined
  }
}
