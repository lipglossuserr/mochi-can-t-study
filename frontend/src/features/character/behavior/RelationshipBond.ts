import type { RelationshipBondSnapshot } from '../types'

/**
 * RelationshipBond — Sprint 6.4.
 *
 * A sixth independent behavioral signal, composed by CharacterEngine
 * exactly like BehavioralMemory, RoomPresence, RoutineFamiliarity, and
 * ObjectAwareness already are. It answers one question that none of the
 * others do: "how deep is the connection that has built up over time?"
 *
 * WHERE THIS FITS IN THE SIGNAL STACK
 *
 *  BehavioralMemory  — "what just happened to her?" (seconds to minutes)
 *  RoomPresence      — "how has this session felt lately?" (minutes)
 *  RoutineFamiliarity— "does this flow feel like something we do?" (minutes to hours)
 *  ObjectAwareness   — "is there a room object worth drifting toward?" (position)
 *  NavigationController — "how does she move there?" (mechanics)
 *  RelationshipBond  — "how much does she trust and know this player?" (hours to session-long)
 *
 * That ordering matters: each signal operates at a longer timescale than
 * the ones before it. RelationshipBond decays the slowest of all — its
 * 4-hour half-life means even a long absence only gently cools the
 * relationship, not reset it. A player returning to a warm session after
 * a 30-minute break still finds a companion who feels comfortable with
 * them; only multi-hour absences produce a noticeable chill.
 *
 * MODEL
 *
 * A single `bond` value (0..1) accumulates from every interaction. Each
 * interaction kind grows it by a fixed, kind-specific increment:
 *
 *  petted     +0.065 — physical touch builds the most trust, fastest
 *  played     +0.050 — shared activity builds attachment
 *  celebrated +0.050 — shared joy builds confidence
 *  fed        +0.040 — caretaking builds security
 *  studied    +0.018 — shared space builds quiet ambient familiarity
 *
 * At these rates, a genuinely engaged session (8–10 interactions across
 * all types) reaches the 'familiar' phase (~0.55). The 'bonded' phase
 * (~0.78) requires sustained, repeated engagement within a session —
 * it's meant to feel earned, not incidental. A new user starts at 0
 * and experiences the 'new' phase for roughly their first 3–4
 * interactions.
 *
 * Decay is the same lazy exponential idiom BehavioralMemory.comfort
 * established in Sprint 5.4: stored as (rawValue, timestamp), decayed
 * at read time with `0.5^(elapsed / halfLife)`. Zero timers of its own.
 * The 4-hour half-life means:
 *   - 30 min break: bond decays ~8% — barely noticeable
 *   - 2 hour break: bond decays ~30% — a slight warmth reduction
 *   - 4 hour break: bond halves — she's a little reserved again
 *   - 8 hour break: bond quarters — mostly back to 'warming' territory
 *
 * WHAT BOND DOES
 *
 * Bond is a BIAS signal, never a gate. It modulates:
 *  - idle-behavior weights (more ambient-thought and observing-room
 *    when bonded; more cautious/alert behaviors when 'new')
 *  - ambient thought category (warmer, more settled categories when
 *    bonded; more curious/novelty-seeking when new)
 *  - anchor visit probability (bonded Mochi initiates more ambient
 *    moments, staying spatially present more often)
 *  - anchor weighting (bonded Mochi gravitates more freely to resting
 *    and comfort anchors)
 *  - BehavioralMemory comfort growth (bonded interactions settle her
 *    in a touch faster — composing through the existing `boost` param)
 *
 * WHAT BOND DOES NOT DO
 *
 * It does not unlock anything, award anything, or show anything to the
 * player. It does not change which states are available. It does not
 * override presence, memory, or routine signals — it composes with them,
 * multiplicatively, the same "bias, never force" contract every other
 * signal in this system follows. Its snapshot is never rendered as UI.
 *
 * INVISIBILITY POLICY
 *
 * The `RelationshipBondSnapshot` field in `CharacterSnapshot` exists as
 * a semantic signal for the renderer (softer expression at high bond,
 * more alert at 'new' phase) and for future Rive compatibility. It is
 * never the source of any visible number, label, or progress indicator.
 *
 * PERSISTENCE
 *
 * None. As with every other behavioral signal in this feature, bond
 * resets on page reload. The brief's "no persistence beyond appropriate
 * local behavioral state, no backend" constraint makes this correct for
 * this sprint. The felt effect is: every new session starts at the
 * 'new' phase but can reach 'familiar' within a single engaged session.
 *
 * RIVE COMPATIBILITY
 *
 * `RelationshipBondSnapshot` exposes `bond` (0..1, continuous) and
 * `phase` (enum string) — both map directly to Rive inputs:
 *  - `bond` → continuous Number input (secondary motion blend)
 *  - `phase` → String/enum input for discrete expression state
 */

export type RelationshipPhase = 'new' | 'warming' | 'familiar' | 'bonded'

/** Interaction kinds the bond system recognises. */
export type BondInteractionKind = 'fed' | 'played' | 'petted' | 'celebrated' | 'studied'

/**
 * How much each interaction kind grows the bond. Sized so that
 * meaningful engagement within a single session builds to a perceptible
 * phase shift, but a single interaction type can't push bond all the
 * way to 'bonded' alone — variety of interaction matters.
 */
const BOND_INCREMENTS: Record<BondInteractionKind, number> = {
  petted:     0.065,
  played:     0.050,
  celebrated: 0.050,
  fed:        0.040,
  studied:    0.018,
}

/**
 * 4-hour half-life: long enough that a typical break between sessions
 * (30–60 min) barely cools the relationship, but a full day away
 * (~12 hours) quarters the bond, landing well back into 'warming'
 * territory. This is the "slightly cool without resetting" behavior the
 * brief asks for.
 */
const BOND_DECAY_HALFLIFE_MS = 4 * 60 * 60 * 1000

/**
 * Bond thresholds for each phase. Deliberately generous gaps so the
 * player never feels "almost there" — the phases are experiential
 * labels the renderer uses, not levels to grind toward.
 *
 *  new:      0..0.22  — first few interactions; cautious, reserved
 *  warming: 0.22..0.52 — trust building; incrementally warmer
 *  familiar: 0.52..0.78 — established companion feeling
 *  bonded:   0.78..1   — deeply warm, comfortable, expressive
 */
const PHASE_THRESHOLDS = {
  warming:  0.22,
  familiar: 0.52,
  bonded:   0.78,
} as const

export class RelationshipBond {
  /**
   * Raw bond value as of `updatedAt`. Always read through `strength` so
   * the lazy decay is applied — never read directly outside this class.
   */
  private rawBond = 0
  private updatedAt = Date.now()
  private onChange: () => void
  private disposed = false

  constructor(onChange: () => void) {
    this.onChange = onChange
  }

  /**
   * Record that an interaction just happened. Bond grows by the kind's
   * fixed increment, applied to the already-decayed current value so
   * repeated interactions compound without ever overflowing — the same
   * "read-then-write" pattern BehavioralMemory.comfort uses.
   *
   * Only calls onChange when the interaction pushes bond across a phase
   * boundary (from 'new' to 'warming', 'warming' to 'familiar', etc.)
   * — avoiding spurious publishes on the many in-phase increments a
   * normal session produces, mirroring RoomPresence's own "only publish
   * on a meaningful change" restraint.
   */
  recordInteraction(kind: BondInteractionKind): void {
    if (this.disposed) return
    const phaseBefore = this.phase
    const current = this.strength
    this.rawBond = Math.min(1, current + BOND_INCREMENTS[kind])
    this.updatedAt = Date.now()
    const phaseAfter = this.phase
    if (phaseAfter !== phaseBefore) this.onChange()
  }

  /**
   * Current bond strength, 0..1, lazily decayed. This is the canonical
   * value all consumers read. Zero extra timers: decay is computed only
   * when something asks for it, not on a polling loop.
   */
  get strength(): number {
    const elapsed = Date.now() - this.updatedAt
    const decay = Math.pow(0.5, elapsed / BOND_DECAY_HALFLIFE_MS)
    return this.rawBond * decay
  }

  /**
   * The relationship's current phase — the semantic label renderers
   * and CharacterEngine use to scale their bias multipliers rather than
   * hard-coding `bond > 0.78` in multiple places.
   */
  get phase(): RelationshipPhase {
    const s = this.strength
    if (s >= PHASE_THRESHOLDS.bonded)  return 'bonded'
    if (s >= PHASE_THRESHOLDS.familiar) return 'familiar'
    if (s >= PHASE_THRESHOLDS.warming)  return 'warming'
    return 'new'
  }

  snapshot(): RelationshipBondSnapshot {
    return { bond: this.strength, phase: this.phase }
  }

  dispose(): void {
    this.disposed = true
    this.rawBond = 0
  }
}
