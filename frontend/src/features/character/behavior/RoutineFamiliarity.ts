import type { RoutineFamiliaritySnapshot } from '../types'

/**
 * RoutineFamiliarity — Sprint 6.0.
 *
 * A third independent behavioral signal, composed by the engine exactly
 * like `BehavioralMemory` and `RoomPresence` already are — not merged
 * into either. Where `BehavioralMemory` answers "what just happened"
 * and `RoomPresence` answers "what's the session's rhythm been like",
 * this answers the one question the brief asks for and nothing more:
 * "does this interaction feel familiar based on recent sessions?"
 *
 * MODEL
 *
 * The vocabulary of interaction kinds is small and fixed (fed, played,
 * petted, celebrated, studied — five kinds), so the space of possible
 * "what usually follows what" pairs is fixed too: at most 5×5 = 25
 * entries, ever. That's what makes "never stores large histories" true
 * structurally rather than by policy — there is no unbounded list to
 * cap or prune, just a small map that can never grow past 25 keys.
 *
 * Each time an interaction happens within `SESSION_GAP_MS` of the
 * previous one, the transition `previous → current` gets a little
 * stronger (capped at 1). Each entry's strength is read back with a
 * lazy exponential decay from the moment it was last reinforced — the
 * same "no timer of its own, just (value, timestamp) decayed at read
 * time" idiom `BehavioralMemory.comfort` already established — so a
 * pattern that stops recurring simply fades on its own the next time
 * anything asks about it, with zero cleanup logic required.
 *
 * `level` is a second, faster-decaying read: how familiar did the
 * MOST RECENT transition feel, fading over roughly a couple of
 * minutes rather than hours. This is the value idle-weighting, ambient
 * thoughts, and the renderer actually consume — a short "that felt
 * like something we do" glow layered on top of the slow-forgetting
 * long-term map, the same two-timescale relationship
 * `BehavioralMemory.dominant` (fast) and `.comfort` (slow) already have
 * with each other.
 */
export type RoutineInteractionKind = 'fed' | 'played' | 'petted' | 'celebrated' | 'studied'

/** How long a gap is still "the same flow" rather than a fresh start. */
const SESSION_GAP_MS = 20 * 60 * 1000
/** How much one recurrence strengthens a transition, capped at 1. */
const STRENGTH_INCREMENT = 0.22
/**
 * How long the LEARNED transition strength takes to fade by half once
 * it stops recurring. Deliberately long (session-scale, not
 * moment-scale) — this is the "slowly forgets routines that stop
 * happening" half of the brief, distinct from `level`'s much quicker
 * decay below. Everything here is in-memory only (per the sprint's own
 * "no persistence beyond appropriate local behavioral state, no
 * backend" constraint) and resets on reload like every other
 * behavioral signal in this feature — this half-life governs forgetting
 * *within* a long session, not across visits.
 */
const LEARNED_DECAY_HALFLIFE_MS = 6 * 60 * 60 * 1000
/** How long the moment-to-moment "that felt familiar" glow takes to
 *  fade by half — short, like an afterglow, not like the learned map. */
const RECENT_GLOW_HALFLIFE_MS = 100_000

interface LearnedTransition {
  value: number
  updatedAt: number
}

export class RoutineFamiliarity {
  private lastKind: RoutineInteractionKind | null = null
  private lastAt = 0
  /** At most 25 entries — see the class doc comment. */
  private learned = new Map<string, LearnedTransition>()
  private recentGlowValue = 0
  private recentGlowUpdatedAt = Date.now()
  private onChange: () => void

  constructor(onChange: () => void) {
    this.onChange = onChange
  }

  /**
   * Record that an interaction just happened. If it followed the
   * previous one closely enough to read as the same flow, the
   * transition between them is reinforced and becomes the new "recent
   * glow" — otherwise this interaction just becomes the new starting
   * point for the next transition, with no penalty and no bookkeeping.
   */
  recordInteraction(kind: RoutineInteractionKind): void {
    const now = Date.now()

    if (this.lastKind && now - this.lastAt < SESSION_GAP_MS) {
      const key = `${this.lastKind}>${kind}`
      const wasFamiliar = this.level > 0.05
      const strengthened = Math.min(1, this.currentLearnedStrength(key) + STRENGTH_INCREMENT)
      this.learned.set(key, { value: strengthened, updatedAt: now })

      this.recentGlowValue = strengthened
      this.recentGlowUpdatedAt = now

      // Only worth a publish the moment familiarity actually becomes
      // noticeable — matches RoomPresence's "only publish on a
      // meaningful change" restraint, so a burst of already-familiar
      // interactions doesn't force extra renders.
      if (!wasFamiliar && strengthened > 0.05) this.onChange()
    }

    this.lastKind = kind
    this.lastAt = now
  }

  /**
   * 0..1 — how familiar the most recent transition felt, decaying over
   * a couple of minutes. This is THE signal every consumer reads; never
   * a gate, always a gentle multiplier, same contract as `afterglow`
   * and `comfort`.
   */
  get level(): number {
    const elapsed = Date.now() - this.recentGlowUpdatedAt
    const decay = Math.pow(0.5, elapsed / RECENT_GLOW_HALFLIFE_MS)
    return this.recentGlowValue * decay
  }

  snapshot(): RoutineFamiliaritySnapshot {
    return { level: this.level }
  }

  dispose(): void {
    this.learned.clear()
    this.lastKind = null
  }

  private currentLearnedStrength(key: string): number {
    const entry = this.learned.get(key)
    if (!entry) return 0
    const elapsed = Date.now() - entry.updatedAt
    const decay = Math.pow(0.5, elapsed / LEARNED_DECAY_HALFLIFE_MS)
    return entry.value * decay
  }
}
