import type { Behavior, CharacterActions, CharacterPosition } from '../types'

/**
 * The behaviour layer: a priority queue of things the character wants
 * to do, executed one at a time.
 *
 * What it supports TODAY (working code):
 *  - queued actions      (enqueue while busy → runs after)
 *  - reaction priorities (higher-priority behaviour interrupts lower)
 *  - timed actions       (behaviours with durationMs auto-complete)
 *  - movement intents    (requestMove stores a target Position that
 *                         the engine exposes to renderers)
 *
 * What it is DESIGNED for but intentionally does not implement yet
 * (this sprint is architectural):
 *  - random idle behaviours: call `setIdleBehaviorFactory` with a
 *    function that returns a Behavior (stretch, yawn, look around);
 *    the controller will invoke it whenever the queue has been empty
 *    for `idleDelayMs`.
 *  - walking: a walk is just a Behavior whose run() interpolates
 *    requestMove() over time; the component tree needs no change
 *    because <Character/> already applies position.
 *  - moving between room locations: use CharacterPosition.anchor
 *    ('desk', 'bed', ...) so behaviours speak in furniture, and a
 *    future RoomLayout maps anchors → coordinates per room.
 */
export class BehaviorController {
  private queue: Behavior[] = []
  private current: Behavior | null = null
  private currentCleanup: void | (() => void) = undefined
  private currentTimer: ReturnType<typeof setTimeout> | undefined
  private idleTimer: ReturnType<typeof setTimeout> | undefined
  private idleBehaviorFactory: (() => Behavior) | null = null
  private idleDelayMs = 8000
  private position: CharacterPosition | null = null
  private disposed = false

  private actions: CharacterActions
  private onPositionChange: () => void

  constructor(actions: CharacterActions, onPositionChange: () => void) {
    this.actions = actions
    this.onPositionChange = onPositionChange
  }

  /**
   * Ask the character to do something. If it outranks the current
   * behaviour, the current one is interrupted (its cleanup runs) and
   * this starts immediately; otherwise it waits its turn.
   */
  request(behavior: Behavior): void {
    if (this.disposed) return

    if (this.current && behavior.priority > this.current.priority) {
      this.stopCurrent()
      this.queue.unshift(behavior)
    } else {
      // Highest priority first; stable for equal priorities (FIFO).
      const index = this.queue.findIndex((queued) => queued.priority < behavior.priority)
      if (index === -1) this.queue.push(behavior)
      else this.queue.splice(index, 0, behavior)
    }
    this.pump()
  }

  /** Record where the character should be/head. Movement is future work. */
  requestMove(position: CharacterPosition): void {
    this.position = position
    this.onPositionChange()
  }

  /**
   * Return to the default layout position (Sprint 6.2). Paired with
   * `requestMove` to close an anchor visit — sets position back to
   * null so renderers restore their default character placement.
   */
  resetPosition(): void {
    this.position = null
    this.onPositionChange()
  }

  getPosition(): CharacterPosition | null {
    return this.position
  }

  /** Future hook: supply a maker of random idle behaviours. */
  setIdleBehaviorFactory(factory: (() => Behavior) | null, idleDelayMs = 8000): void {
    this.idleBehaviorFactory = factory
    this.idleDelayMs = idleDelayMs
    this.armIdleTimer()
  }

  dispose(): void {
    this.disposed = true
    this.stopCurrent()
    this.queue = []
    clearTimeout(this.idleTimer)
  }

  // ------------------------------------------------------------------

  private pump(): void {
    if (this.disposed || this.current) return
    const next = this.queue.shift()
    if (!next) {
      this.armIdleTimer()
      return
    }

    this.current = next
    this.currentCleanup = next.run(this.actions)
    if (next.durationMs !== undefined) {
      this.currentTimer = setTimeout(() => this.finishCurrent(), next.durationMs)
    }
    // A behaviour without durationMs is expected to be instantaneous;
    // finish it on the next tick so the queue keeps flowing.
    else {
      this.finishCurrent()
    }
  }

  private finishCurrent(): void {
    clearTimeout(this.currentTimer)
    this.current = null
    this.currentCleanup = undefined
    this.pump()
  }

  private stopCurrent(): void {
    clearTimeout(this.currentTimer)
    if (typeof this.currentCleanup === 'function') this.currentCleanup()
    this.current = null
    this.currentCleanup = undefined
  }

  private armIdleTimer(): void {
    clearTimeout(this.idleTimer)
    if (!this.idleBehaviorFactory || this.disposed) return
    // Jitter (0.6x–1.6x) keeps idle behaviours from feeling metronomic.
    const delay = this.idleDelayMs * (0.6 + Math.random())
    this.idleTimer = setTimeout(() => {
      if (this.idleBehaviorFactory && !this.current && this.queue.length === 0) {
        this.request(this.idleBehaviorFactory())
        this.armIdleTimer()
      }
    }, delay)
  }
}
