import { characterEvents } from '../events/characterEventBus'
import { CharacterStateMachine } from '../state/CharacterStateMachine'
import { BehaviorController } from '../behavior/BehaviorController'
import { BehavioralMemory } from '../behavior/BehavioralMemory'
import { RoomPresence } from '../behavior/RoomPresence'
import { RoutineFamiliarity } from '../behavior/RoutineFamiliarity'
import { ObjectAwareness } from '../behavior/ObjectAwareness'
import { RelationshipBond } from '../behavior/RelationshipBond'
import { NavigationController, HOME_POSITION } from '../navigation/NavigationController'
import { GazeController, type GazeTarget } from '../gaze/GazeController'
import type {
  AfterglowState,
  Behavior,
  CharacterActions,
  CharacterEvent,
  CharacterPosition,
  CharacterSnapshot,
  CharacterStateId,
  MemoryKind,
  RoomPresenceSnapshot,
} from '../types'
import type { RoomAnchor, AnchorBehaviorTag } from '../behavior/ObjectAwareness'
import { DailyRoutine, type DailyActivity } from '../behavior/DailyRoutine'
import { prefersReducedMotion } from '../utils/reducedMotion'

/**
 * A reaction is never just one state — it's a little story:
 *   notice it → do it → enjoy having done it → (renderer eases back to idle)
 */
interface ReactionTiming {
  anticipationMs?: number
  actionMs: number
  settleMs?: number
}

const REACTION_TIMING: Record<'eating' | 'playing' | 'celebrating' | 'pet', ReactionTiming> = {
  eating:     { anticipationMs: 260, actionMs: 1500, settleMs: 900 },
  playing:    { anticipationMs: 220, actionMs: 1500, settleMs: 1100 },
  celebrating:{ anticipationMs: 200, actionMs: 1800, settleMs: 1000 },
  pet:        { actionMs: 1800, settleMs: 750 },
}

const PHASE_PRIORITY = {
  eating:     { anticipating: 18, action: 20, content: 12 },
  playing:    { anticipating: 18, action: 20, content: 12 },
  celebrating:{ anticipating: 25, action: 30, content: 22 },
  pet:        { action: 10, content: 6 },
} as const

const REACTION_MEMORY: Record<'eating' | 'playing' | 'celebrating', MemoryKind> = {
  eating:     'fed',
  playing:    'played',
  celebrating:'celebrated',
}

// ---------------------------------------------------------------------
// Idle life
// ---------------------------------------------------------------------

// Exported (visibility-only change, Sprint 6.6D-1) so the renderer
// capability validator can build its canonical state list from this
// single source of truth instead of hand-maintaining a duplicate.
export type IdleMicroId =
  | 'stretching'
  | 'yawning'
  | 'looking-around'
  | 'curiosity-pause'
  | 'ambient-thought'
  | 'observing-room'

interface IdleBehaviorSpec {
  id: IdleMicroId
  weight: number
  cooldownMs: number
  requiresCursorActivity?: boolean
  overlayMs?: number
}

const NATURAL_PAUSE_CHANCE = 0.14

/**
 * Base anchor visit chance. Sprint 6.4: increased dynamically with
 * relationship bond — a more bonded companion initiates more ambient
 * spatial presence, per the brief's "initiate more ambient interactions"
 * requirement. See `effectiveAnchorVisitChance()`.
 */
const ANCHOR_VISIT_CHANCE_BASE = 0.15
/** Maximum additive bonus from a fully bonded relationship. */
const ANCHOR_VISIT_CHANCE_BOND_BONUS = 0.07

const ANCHOR_DWELL_MS = 3200

const IDLE_BEHAVIOR_SPECS: IdleBehaviorSpec[] = [
  { id: 'looking-around',  weight: 40, cooldownMs: 9_000 },
  { id: 'stretching',      weight: 18, cooldownMs: 45_000 },
  { id: 'curiosity-pause', weight: 14, cooldownMs: 20_000, requiresCursorActivity: true },
  { id: 'yawning',         weight: 8,  cooldownMs: 60_000 },
  { id: 'ambient-thought', weight: 5,  cooldownMs: 90_000 },
  { id: 'observing-room',  weight: 3,  cooldownMs: 150_000, overlayMs: 2800 },
]

const CURSOR_ACTIVITY_WINDOW_MS = 15_000

const IDLE_CHAINS: Partial<Record<IdleMicroId, IdleMicroId[]>> = {
  stretching: ['looking-around'],
  yawning:    ['looking-around'],
}
const CHAIN_CHANCE = 0.3

/**
 * Sprint 6.7A-3 — "long-focus behaviour": how long into a continuous
 * study session before ambient behaviour shifts from "just settled in"
 * to "been at this a while" (more contemplative pauses, more likely to
 * want a stretch break). Deliberately shorter than
 * RiveCharacterRenderer's own FOCUS_LEVEL_3_AFTER_MS (8min, which
 * escalates the .riv asset's visual focus pose) — this is the ambient
 * *behaviour* layer noticing the same thing sooner, not a duplicate of
 * that timer; the two are independent signals that happen to agree in
 * spirit.
 */
const LONG_FOCUS_MS = 5 * 60_000

/**
 * Sprint 6.7A-4 — approximate on-screen directions for scripted study-
 * room "desk interaction" glances, in the same normalized [-1,1]
 * coordinate system ProceduralLayer's ANCHOR_LOOK_TARGET already
 * established for room-anchor look targets. These are rough — the
 * study panel's exact position shifts with viewport/layout — a brief,
 * approximate glance reads as intentional; pixel-perfect aim doesn't
 * matter for a half-second look.
 */
const STUDY_GLANCE_TARGETS: Record<'notebook' | 'timer' | 'webcam', GazeTarget> = {
  notebook: { x: -0.55, y: 0.35 },
  timer:    { x: 0.15,  y: 0.3 },
  webcam:   { x: 0.6,   y: 0.05 },
}

/**
 * Sprint 6.7A-4 — contextual study-room speech lines, shown via the
 * existing `showThought` mechanism (Sprint 5.3B's ambient-thought
 * pipeline — CharacterSnapshot.thought). Each pool is deliberately
 * small and hand-written rather than templated, matching
 * AMBIENT_THOUGHT_CATEGORIES' existing style elsewhere in this file.
 */
const STUDY_SPEECH = {
  sessionStart: ["Let's do this together ♡", 'Okay, focus time!', "I'm right here with you."],
  resume:       ['Back to it ♡', 'Okay, picking up again.', "Let's keep going."],
  pause:        ['Stretch break ♡', 'Rest a little.', 'Take your time.'],
  longFocus:    ["You've been at this a while — nice focus!", 'Really in the zone.', 'Proud of this focus streak.'],
  completionValid:   ['You did it! So proud of you ♡', 'Amazing focus today!'],
  completionPartial: ['Nice effort — every minute counts.', 'Good work, even if it was short.'],
  completionInvalid: ["That's okay — next time ♡", 'No worries, we can try again.'],
} as const

/** Shown when the posture heuristic suggests a stretch — see CharacterEvent's 'posture-nudge-suggested' doc comment. Deliberately gentle, never alarming ("you're slouching!"), since this is a low-confidence heuristic on a webcam feed, not a diagnosis. */
const POSTURE_SPEECH = ['Stretch break? ♡', "Let's roll our shoulders back!", 'Sit up tall with me for a sec ♡']

/** Shown on the 'user-tickled' event — see that CharacterEvent's doc comment. Playful, not the same register as POSTURE_SPEECH/STUDY_SPEECH — tickling is pure silliness, not encouragement. */
const TICKLE_SPEECH = ['Hehehe, stop— okay don\'t stop ♡', 'Tehehe!', 'Eeeeee!', 'You found my ticklish spot!', 'Pfft— hehe!']

/** Shown on 'user-double-tapped' — a quick, light "!" beat, not as silly as a tickle. */
const DOUBLE_TAP_SPEECH = ['!', 'Oh!', 'Hi again ♡', 'Hehe, twice!']

/** Shown on 'user-held' — calm and content, the register a settled pet gets, not an excited one. */
const HOLD_SPEECH = ['mmm ♡', "That's nice…", '*purrs*', 'Comfy ♡']

/** Shown on 'konami-unlocked' — the one line in this file allowed to be a little self-aware/meta, since finding the code IS the joke. */
const KONAMI_SPEECH = ["You know the code?! ♡", 'No way— you found it!', "That's the secret code! ♡"]

/**
 * A fresh session started between local midnight and 4am — see the
 * 'study-session-started' handler below. Only a CHANCE, not every
 * time (see MIDNIGHT_SPEECH_CHANCE) — showing it on every single late
 * session would turn a delight into nagging.
 */
const MIDNIGHT_SPEECH = [
  'Burning the midnight oil? ♡',
  "It's really late — I'm here with you though ♡",
  'Night owl mode ♡',
]
const MIDNIGHT_SPEECH_CHANCE = 0.4

/** How many completed (non-invalid) sessions in one visit before a streak-milestone thought. */
const STREAK_MILESTONE_EVERY = 3

function streakMilestoneMessage(count: number): string {
  const templates = [
    `That's ${count} sessions today — you're on a roll! ♡`,
    `${count} sessions in one visit — look at you go!`,
  ]
  return pickRandom(templates)
}

/**
 * How often the daily routine checks whether to initiate an autonomous
 * activity. The actual interval is jittered ±25% around this value so
 * checks never feel clockwork-regular.
 */
const DAILY_ROUTINE_TICK_MS = 3 * 60_000

/** Initial pause before the first autonomous activity check (ms). */
const DAILY_ROUTINE_INITIAL_DELAY_MS = 90_000

type AmbientThoughtCategory = 'comfort' | 'contentment' | 'curiosity' | 'sleepy' | 'humming' | 'focused'

const AMBIENT_THOUGHT_CATEGORIES: Record<AmbientThoughtCategory, readonly string[]> = {
  comfort:     ["I'm comfy.", 'Mm.'],
  contentment: ['What a cozy room.', '...'],
  curiosity:   ['Hmm?', '...what was that?'],
  sleepy:      ['*yawn*', 'So sleepy...'],
  humming:     ['♪', '~♪~'],
  // Sprint 6.7A-3: study-room-only tone — see pickAmbientThought's
  // `studying` param. Never surfaces outside a study session.
  focused:     ['Mm, good pace.', 'Almost got it...', 'Focus mode.', '...okay, next part.'],
}

const BASE_THOUGHT_WEIGHTS: Record<AmbientThoughtCategory, number> = {
  comfort:     20,
  contentment: 16,
  curiosity:   10,
  sleepy:      8,
  humming:     10,
  focused:     0, // never picked outside a study session — see pickAmbientThought
}

const AMBIENT_THOUGHT_MS = 3400

const TAG_BEHAVIORS: Record<AnchorBehaviorTag, IdleMicroId[]> = {
  resting:   ['yawning', 'stretching'],
  observing: ['observing-room', 'looking-around'],
  curious:   ['looking-around', 'curiosity-pause'],
  studying:  ['looking-around', 'observing-room'],
}

function pickRandom<T>(options: readonly T[]): T {
  return options[Math.floor(Math.random() * options.length)]
}

function pickWeighted<K extends string>(weights: Record<K, number>): K {
  const entries = Object.entries(weights) as Array<[K, number]>
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = Math.random() * total
  for (const [label, weight] of entries) {
    roll -= weight
    if (roll <= 0) return label
  }
  return entries[entries.length - 1][0]
}

/**
 * Pick an ambient thought category biased by afterglow, room presence,
 * routine familiarity, (Sprint 6.4) relationship bond, and (Sprint
 * 6.7A-3) whether a study session is active.
 *
 * Bond influence: a bonded companion leans toward warm, settled
 * categories (comfort, contentment, humming) and away from curiosity —
 * she's at ease, not on alert. A new companion (low bond) is slightly
 * more curious/novelty-seeking: everything is still unfamiliar.
 *
 * Studying: this is a tone gate, not just a weight nudge. "So sleepy..."
 * or a hum mid-Pomodoro would read as checked-out, not companionable —
 * so `sleepy`/`humming` are excluded outright while studying, and
 * `focused` (otherwise unreachable — its base weight is 0) becomes the
 * dominant category, blended with the always-appropriate `comfort`/
 * `curiosity` for variety.
 */
function pickAmbientThought(
  afterglow: AfterglowState | null,
  env: RoomPresenceSnapshot,
  routineLevel: number,
  bondStrength: number,
  studying: boolean,
): string {
  const weights: Record<AmbientThoughtCategory, number> = { ...BASE_THOUGHT_WEIGHTS }

  if (studying) {
    weights.sleepy = 0
    weights.humming = 0
    weights.focused = 24
    weights.contentment *= 0.5
  }

  if (env.stage === 'quiet' || env.stage === 'deep-quiet') {
    const quietness = env.stage === 'deep-quiet' ? 1 : 0.55
    weights.sleepy    *= 1 + 1.4 * quietness
    weights.humming   *= 1 + 0.4 * quietness
    weights.curiosity *= 1 - 0.55 * quietness
  }
  if (env.stage === 'active') {
    weights.curiosity *= 1.8
    weights.sleepy    *= 0.35
  }
  if (afterglow?.kind === 'petted' || afterglow?.kind === 'celebrated') weights.contentment *= 1.6
  if (afterglow?.kind === 'fed')  weights.comfort *= 1.5
  if (env.comfort > 0)            weights.comfort *= 1 + env.comfort
  if (routineLevel > 0) {
    weights.contentment *= 1 + 0.5 * routineLevel
    weights.comfort     *= 1 + 0.3 * routineLevel
    weights.curiosity   *= 1 - 0.35 * routineLevel
  }

  // Relationship bond (Sprint 6.4): bonded companion expresses warmth
  // and settledness; new companion is more curiosity-forward. Both are
  // gentle nudges — the category pool never collapses to a single choice.
  if (bondStrength > 0) {
    weights.contentment *= 1 + 0.6 * bondStrength
    weights.comfort     *= 1 + 0.5 * bondStrength
    weights.humming     *= 1 + 0.3 * bondStrength
    weights.curiosity   *= 1 - 0.3 * bondStrength  // at ease, not on alert
  }
  if (bondStrength < 0.3) {
    // New companion: slightly more likely to notice something novel
    weights.curiosity *= 1 + 0.4 * (1 - bondStrength / 0.3)
  }

  const category = pickWeighted(weights)
  return pickRandom(AMBIENT_THOUGHT_CATEGORIES[category])
}

/**
 * CharacterEngine — the façade the rest of the application talks to.
 *
 * Composes six independent behavioral modules:
 *  1. BehavioralMemory      — "what just happened?" (seconds–minutes)
 *  2. RoomPresence          — "how has the session felt?" (minutes)
 *  3. RoutineFamiliarity    — "does this flow feel familiar?" (minutes–hours)
 *  4. ObjectAwareness       — "is there a room object to visit?" (position)
 *  5. NavigationController  — "how does she move?" (mechanics)
 *  6. RelationshipBond      — "how deep is the connection?" (hours) [Sprint 6.4]
 *
 * Sprint 6.4 additions are entirely additive: RelationshipBond is a
 * sixth module composed identically to the other five. The public API
 * surface (CharacterActions, CharacterSnapshot shape minus the new
 * `relationship` field, event bus) is unchanged.
 */
export class CharacterEngine {
  private stateMachine: CharacterStateMachine
  private behavior: BehaviorController
  private listeners = new Set<() => void>()
  private snapshot: CharacterSnapshot
  private unsubscribeEvents: Array<() => void> = []

  private reactionTimers: Array<ReturnType<typeof setTimeout>> = []
  private reactionGeneration = 0
  private pettingSettleTimer: ReturnType<typeof setTimeout> | undefined

  private memory: BehavioralMemory
  private presence: RoomPresence
  private routine: RoutineFamiliarity
  private objectAwareness: ObjectAwareness
  private navigation: NavigationController

  /**
   * Relationship bond (Sprint 6.4). A sixth independent module — same
   * constructor-injected onChange pattern, same composed-not-merged
   * architecture, same lazy-decay zero-timer idiom. Operates at a much
   * longer timescale than all five preceding modules: a 4-hour half-life
   * means it captures session-level accumulated trust rather than
   * moment-to-moment or even routine-level patterns.
   */
  private bond: RelationshipBond

  /**
   * Daily routine (Sprint 6.5): seventh independent behavioral module,
   * initiating autonomous quiet activities on a long jittered interval.
   */
  private dailyRoutine: DailyRoutine
  private dailyRoutineTimer: ReturnType<typeof setTimeout> | undefined

  private thought: string | null = null
  private thoughtTimer: ReturnType<typeof setTimeout> | undefined

  private idleCooldowns = new Map<IdleMicroId, number>()
  private idleTimers: Array<ReturnType<typeof setTimeout>> = []
  private lastCursorActivityAt = 0
  private unsubscribeGaze: (() => void) | undefined
  /** Sprint 6.7A-3: when the current study session began, for "long-focus behaviour". */
  private studyingSinceTs: number | null = null
  /** Sprint 6.7A-4: fires the one-shot long-focus thought; cleared whenever studying ends/pauses. */
  private longFocusTimer: ReturnType<typeof setTimeout> | undefined
  /** Sprint 6.7A-4: fires whenever a scripted glance (see scriptedGlance()) should release back to normal gaze/anchor tracking. */
  private glanceTimer: ReturnType<typeof setTimeout> | undefined
  /**
   * Sprint 6.7A-4: completed (non-invalid) study sessions this browser
   * visit — in-memory only, like every other engine counter in this
   * class (idleCooldowns, routine level, etc.); not a persisted backend
   * streak. Resets on reload. Drives the "streak milestone" speech
   * trigger via STREAK_MILESTONE_EVERY.
   */
  private completedStudySessionsThisVisit = 0

  readonly actions: CharacterActions
  readonly gaze = new GazeController()
  /**
   * Sprint 6.7A-4 — a second, independent GazeController instance (same
   * class, zero duplicated logic) dedicated to brief scripted "desk
   * interaction" glances (notebook/timer/webcam). Kept separate from
   * `gaze` (the cursor-awareness channel — `useCursorAwareness` writes
   * to it many times a second) specifically so a scripted glance isn't
   * instantly clobbered by the next mouse-move event; ProceduralLayer
   * gives `glance` priority over `gaze` when both are present.
   */
  readonly glance = new GazeController()

  constructor() {
    this.stateMachine = new CharacterStateMachine(() => this.publish())
    this.memory       = new BehavioralMemory(() => this.publish())
    this.presence     = new RoomPresence(() => this.publish())
    this.routine      = new RoutineFamiliarity(() => this.publish())
    this.objectAwareness = new ObjectAwareness(() => this.publish())
    this.navigation   = new NavigationController(() => this.publish())
    this.bond         = new RelationshipBond(() => this.publish())
    this.dailyRoutine = new DailyRoutine(() => this.publish())
    this.registerReactionStates()

    this.actions = {
      feed:     () => this.react('eating'),
      play:     () => this.react('playing'),
      pet:      () => this.reactToPetting(),
      celebrate:() => this.react('celebrating'),
      sleep:    () => this.stateMachine.setBase('sleeping'),
      study:    () => {
        this.routine.recordInteraction('studied')
        // Sprint 6.4: studying now also builds relationship bond —
        // shared space, even quietly, grows gentle familiarity.
        this.bond.recordInteraction('studied')
        // Sprint 6.7A-3: (re)starts the long-focus clock — consistent
        // with RiveCharacterRenderer's own focus-escalation timer, which
        // likewise resets on every transition into 'studying', pause-
        // and-resume included.
        this.studyingSinceTs = Date.now()
        // Sprint 6.7A-4: schedules the one-shot long-focus thought here
        // (not just at the wireEvents call site) so it's always correct
        // even if `study()` is ever invoked from a second place later.
        this.scheduleLongFocusThought()
        this.stateMachine.setBase('studying')
      },
      idle:           () => this.stateMachine.setBase('idle'),
      setBaseState:   (state: CharacterStateId) => this.stateMachine.setBase(state),
      moveTo:         (position: CharacterPosition) => {
        this.navigation.beginMoveTo(this.navigation.currentPosition(), position)
      },
      resetPosition:  () => this.navigation.interrupt(),
    }

    this.behavior = new BehaviorController(this.actions, () => this.publish())
    this.snapshot = this.buildSnapshot()
    this.wireEvents()
    this.startDailyRoutineTimer()
    this.wireIdleBehaviors()
  }

  // ---------------- idle life ----------------

  private wireIdleBehaviors(): void {
    const STATEFUL_MICRO_STATES: IdleMicroId[] = [
      'stretching', 'yawning', 'looking-around', 'curiosity-pause', 'observing-room',
    ]
    STATEFUL_MICRO_STATES.forEach((id) => this.stateMachine.registerState({ id, priority: 2 }))

    this.unsubscribeGaze = this.gaze.subscribe((target) => {
      if (target) this.lastCursorActivityAt = Date.now()
    })

    this.behavior.setIdleBehaviorFactory(
      () => this.buildIdleBehavior(this.pickIdleBehaviorId()),
      11000,
    )
  }

  /**
   * Dynamic anchor visit chance (Sprint 6.4).
   *
   * A bonded companion initiates more ambient spatial presence — she
   * wanders toward room objects more often, comfortable doing so near
   * a player she trusts. The bonus is additive (never multiplicative,
   * to keep it from compounding with bond's anchor-weight influence
   * already in ObjectAwareness.weightFor) and capped conservatively.
   */
  private effectiveAnchorVisitChance(): number {
    return ANCHOR_VISIT_CHANCE_BASE + ANCHOR_VISIT_CHANCE_BOND_BONUS * this.bond.strength
  }

  /** Sprint 6.7A-3: ms into the current continuous study session, or 0 if not studying. */
  private studyingElapsedMs(): number {
    if (this.stateMachine.baseState !== 'studying' || this.studyingSinceTs === null) return 0
    return Date.now() - this.studyingSinceTs
  }

  /**
   * Sprint 6.7A-4 — a brief scripted "desk interaction" glance (look at
   * the notebook / timer / webcam). Releases back to normal gaze/anchor
   * tracking after `holdMs` — this is a momentary beat, not a new
   * sustained look state.
   */
  private scriptedGlance(target: GazeTarget, holdMs = 1400): void {
    if (prefersReducedMotion()) return
    clearTimeout(this.glanceTimer)
    this.glance.set(target)
    this.glanceTimer = setTimeout(() => this.glance.set(null), holdMs)
  }

  /**
   * Sprint 6.7A-4 — schedules the one-shot "long focus" thought. Called
   * every time a study session (re)starts, mirroring studyingSinceTs's
   * own reset-on-every-RUNNING-transition behaviour (pause-and-resume
   * included) so long-focus always measures the *current* continuous
   * stretch, not a stale one from before a break.
   */
  private scheduleLongFocusThought(): void {
    clearTimeout(this.longFocusTimer)
    this.longFocusTimer = setTimeout(() => {
      if (this.stateMachine.baseState === 'studying') {
        this.showThought(pickRandom(STUDY_SPEECH.longFocus))
      }
    }, LONG_FOCUS_MS)
  }

  private pickIdleBehaviorId(): IdleMicroId | 'natural-pause' | 'anchor-visit' {
    // Sprint 6.7A-3: ambient micro-behaviour now also runs while
    // studying (see buildIdleBehavior's/maybeChain's baseState guards),
    // but only the stationary, desk-bound ones — a "continuous study
    // companion" doesn't wander off to the bed mid-Pomodoro. Skip the
    // two rolls that move her elsewhere or do nothing, and fall straight
    // into the weighted stationary pick below.
    const studying = this.stateMachine.baseState === 'studying'

    if (!studying && Math.random() < NATURAL_PAUSE_CHANCE) return 'natural-pause'

    if (!studying && Math.random() < this.effectiveAnchorVisitChance()) {
      const presenceSnapshot = this.presence.snapshot()
      const anchor = this.objectAwareness.pickAnchor(
        this.stateMachine.baseState,
        presenceSnapshot.stage,
        this.memory.comfort,
        this.routine.level,
        this.bond.strength,   // Sprint 6.4
      )
      if (anchor) return 'anchor-visit'
    }

    const now = Date.now()
    const cursorActive = now - this.lastCursorActivityAt < CURSOR_ACTIVITY_WINDOW_MS
    const afterglow    = this.memory.dominant
    const env          = this.currentEnv()
    const routineLevel = this.routine.level
    const bondStrength = this.bond.strength

    const eligible = IDLE_BEHAVIOR_SPECS.filter((spec) => {
      const lastFired = this.idleCooldowns.get(spec.id) ?? 0
      if (now - lastFired < spec.cooldownMs) return false
      if (spec.requiresCursorActivity && !cursorActive) return false
      return true
    })
    const candidates = eligible.length > 0
      ? eligible
      : IDLE_BEHAVIOR_SPECS.filter((spec) => !spec.requiresCursorActivity)

    const weighted = candidates.map((spec) => ({
      spec,
      weight: this.weighFor(spec, afterglow, env, routineLevel, bondStrength),
    }))
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0)
    let roll = Math.random() * total
    for (const entry of weighted) {
      roll -= entry.weight
      if (roll <= 0) return entry.spec.id
    }
    return weighted[weighted.length - 1].spec.id
  }

  private currentEnv(): RoomPresenceSnapshot {
    return { ...this.presence.snapshot(), comfort: this.memory.comfort }
  }

  /**
   * Habit weighting: afterglow, room presence, routine familiarity, and
   * (Sprint 6.4) relationship bond all nudge the probability of each
   * idle micro-behavior. Bond's influence:
   *
   *  ambient-thought: bonded companion shares more of herself — the
   *    core "warmer idle behavior" requirement. A new companion voices
   *    thoughts less (she's still finding her footing).
   *
   *  observing-room: bonded → more peaceful, spacious observation
   *    moments. New companion → these are rarer (she doesn't yet feel
   *    comfortable enough to just sit and look around).
   *
   *  curiosity-pause: a new companion is SLIGHTLY more likely to do
   *    alert glances (everything is still novel), but the cursor-
   *    activity gate still applies regardless of bond.
   *
   *  stretching: a bonded companion is more physically settled —
   *    slightly less restless stretching as tension fades.
   *
   * All multipliers here are smaller than the equivalent afterglow and
   * presence terms — bond is a background signal, not a foreground one.
   */
  private weighFor(
    spec: IdleBehaviorSpec,
    afterglow: AfterglowState | null,
    env: RoomPresenceSnapshot,
    routineLevel: number,
    bondStrength: number,
  ): number {
    let weight = spec.weight

    // Afterglow (existing)
    if (afterglow) {
      const strong = afterglow.phase === 'fresh' ? 1 : 0.5
      if (spec.id === 'ambient-thought') weight *= 1 + 0.6 * strong
      if (spec.id === 'stretching' && afterglow.kind !== 'played') weight *= 1 - 0.4 * strong
      if (spec.id === 'curiosity-pause' && afterglow.kind === 'played') weight *= 1 + 0.5 * strong
    }

    // Quiet-time (existing)
    const quietness = env.stage === 'deep-quiet' ? 1 : env.stage === 'quiet' ? 0.55 : 0
    if (quietness > 0) {
      if (spec.id === 'yawning')        weight *= 1 + 0.7 * quietness
      if (spec.id === 'stretching')     weight *= 1 + 0.3 * quietness
      if (spec.id === 'curiosity-pause')weight *= 1 - 0.5 * quietness
      if (spec.id === 'observing-room') weight *= 1 + 1.6 * quietness
      if (spec.id === 'ambient-thought')weight *= 1 + 0.25 * quietness
    }

    // Activity level (existing)
    if (env.activityLevel > 0) {
      if (spec.id === 'curiosity-pause') weight *= 1 + 0.6 * env.activityLevel
      if (spec.id === 'looking-around')  weight *= 1 + 0.2 * env.activityLevel
      if (spec.id === 'yawning')         weight *= 1 - 0.5 * env.activityLevel
      if (spec.id === 'observing-room')  weight *= 1 - 0.3 * env.activityLevel
    }

    // Behavioral momentum/comfort (existing)
    if (env.comfort > 0) {
      if (spec.id === 'ambient-thought') weight *= 1 + 0.4 * env.comfort
      if (spec.id === 'stretching')      weight *= 1 - 0.2 * env.comfort
    }

    // Routine familiarity (existing)
    if (routineLevel > 0) {
      if (spec.id === 'ambient-thought') weight *= 1 + 0.3 * routineLevel
      if (spec.id === 'observing-room')  weight *= 1 + 0.5 * routineLevel
      if (spec.id === 'curiosity-pause') weight *= 1 - 0.3 * routineLevel
    }

    // Relationship bond (Sprint 6.4)
    if (bondStrength > 0) {
      if (spec.id === 'ambient-thought') weight *= 1 + 0.45 * bondStrength
      if (spec.id === 'observing-room')  weight *= 1 + 0.35 * bondStrength
      if (spec.id === 'stretching')      weight *= 1 - 0.15 * bondStrength
    }
    if (bondStrength < 0.3) {
      // New companion: slightly more alert glances (everything novel),
      // slightly fewer unprompted ambient thoughts.
      if (spec.id === 'curiosity-pause')  weight *= 1 + 0.25 * (1 - bondStrength / 0.3)
      if (spec.id === 'ambient-thought')  weight *= 0.75 + 0.25 * (bondStrength / 0.3)
    }

    // Sprint 6.7A-3: studying / long-focus behaviour. Only the
    // stationary specs ever reach here while studying (pickIdleBehaviorId
    // excludes natural-pause/anchor-visit), so this just shapes the mix
    // among them — fewer big "looking around" glances (she's focused on
    // the desk), more of the quieter "pause and look up for a moment."
    if (this.stateMachine.baseState === 'studying') {
      if (spec.id === 'looking-around') weight *= 0.6
      if (spec.id === 'observing-room') weight *= 1.5
      if (spec.id === 'stretching')     weight *= 1.2

      if (this.studyingElapsedMs() > LONG_FOCUS_MS) {
        // Long-focus behaviour: after a sustained stretch, she settles
        // further into it — more contemplative pauses and a bit more
        // pull toward a stretch break, same as a real study session.
        if (spec.id === 'observing-room')  weight *= 1.4
        if (spec.id === 'ambient-thought') weight *= 1.3
        if (spec.id === 'stretching')      weight *= 1.3
      }
    }

    return weight
  }

  private buildIdleBehavior(id: IdleMicroId | 'natural-pause' | 'anchor-visit'): Behavior {
    if (id === 'natural-pause') {
      return { id: 'idle-natural-pause', priority: 0, durationMs: 0, run: () => {} }
    }

    if (id === 'anchor-visit') {
      const presenceSnapshot = this.presence.snapshot()
      const anchor = this.objectAwareness.pickAnchor(
        this.stateMachine.baseState,
        presenceSnapshot.stage,
        this.memory.comfort,
        this.routine.level,
        this.bond.strength,   // Sprint 6.4
      )
      if (anchor) return this.buildAnchorVisitBehavior(anchor)
      this.idleCooldowns.set('looking-around', Date.now())
      return this.buildIdleBehavior('looking-around')
    }

    this.idleCooldowns.set(id, Date.now())

    if (id === 'ambient-thought') {
      return {
        id: `idle-${id}`,
        priority: 1,
        durationMs: 400,
        run: () => {
          this.showThought(
            pickAmbientThought(
              this.memory.dominant,
              this.currentEnv(),
              this.routine.level,
              this.bond.strength,   // Sprint 6.4
              this.stateMachine.baseState === 'studying',   // Sprint 6.7A-3
            ),
          )
        },
      }
    }

    const overlayMs = IDLE_BEHAVIOR_SPECS.find((spec) => spec.id === id)?.overlayMs ?? 2000

    return {
      id: `idle-${id}`,
      priority: 1,
      durationMs: overlayMs + 200,
      run: () => {
        const noticeMs = 220 + Math.random() * 180
        const notice = setTimeout(() => {
          // Sprint 6.7A-3: ambient micro-behaviour now also plays while
          // studying (a "continuous study companion" shouldn't go
          // silent for the whole session) — see this class's doc header
          // and pickIdleBehaviorId for what's excluded (navigation).
          if (this.isAmbientEligibleBaseState()) {
            this.stateMachine.pushOverlay(id, overlayMs)
            this.maybeChain(id)
            // Sprint 6.7A-4: "Mochi occasionally glances at the
            // notebook" — piggybacks on the two ambient behaviours that
            // already read as "looking at something" while studying,
            // rather than inventing a dedicated notebook-glance
            // micro-behaviour with its own weight/cooldown bookkeeping.
            if (this.stateMachine.baseState === 'studying' && (id === 'looking-around' || id === 'observing-room')) {
              this.scriptedGlance(STUDY_GLANCE_TARGETS.notebook, overlayMs)
            }
          }
        }, noticeMs)
        this.idleTimers.push(notice)
        return () => clearTimeout(notice)
      },
    }
  }

  private buildAnchorVisitBehavior(anchor: RoomAnchor): Behavior {
    const VISIT_MAX_MS = 11200
    const visitTimers: Array<ReturnType<typeof setTimeout>> = []

    return {
      id: `idle-anchor-visit-${anchor.id}`,
      priority: 1,
      durationMs: VISIT_MAX_MS,
      run: () => {
        const from = this.navigation.currentPosition() ?? HOME_POSITION
        this.objectAwareness.recordVisit(anchor.id)

        const anchorDest: CharacterPosition = { ...anchor.position, anchor: anchor.id }

        this.navigation.beginMoveTo(from, anchorDest, {
          onSettled: () => {
            if (this.stateMachine.baseState !== 'idle') {
              this.navigation.beginMoveTo(anchor.position, HOME_POSITION, {
                onSettled: () => {
                  this.navigation.clearPosition()
                  this.objectAwareness.clearCurrentAnchor()
                },
              })
              return
            }

            const microId = this.pickAnchorMicro(anchor)
            const overlayMs = IDLE_BEHAVIOR_SPECS.find((s) => s.id === microId)?.overlayMs ?? 2000
            this.stateMachine.pushOverlay(microId, overlayMs)
            this.idleCooldowns.set(microId, Date.now())

            const dwellTimer = setTimeout(() => {
              this.navigation.beginMoveTo(anchor.position, HOME_POSITION, {
                onSettled: () => {
                  this.navigation.clearPosition()
                  this.objectAwareness.clearCurrentAnchor()
                },
              })
            }, ANCHOR_DWELL_MS)

            visitTimers.push(dwellTimer)
            this.idleTimers.push(dwellTimer)
          },
        })

        return () => {
          visitTimers.forEach(clearTimeout)
          this.navigation.interrupt()
          this.objectAwareness.clearCurrentAnchor()
        }
      },
    }
  }

  private pickAnchorMicro(anchor: RoomAnchor): IdleMicroId {
    const cursorActive = Date.now() - this.lastCursorActivityAt < CURSOR_ACTIVITY_WINDOW_MS

    const candidates = anchor.tags
      .flatMap((tag) => TAG_BEHAVIORS[tag])
      .filter((id): id is IdleMicroId => {
        if (id === 'curiosity-pause' && !cursorActive) return false
        return true
      })

    const seen = new Set<IdleMicroId>()
    const unique = candidates.filter((id) => {
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })

    return unique.length > 0 ? pickRandom(unique) : 'looking-around'
  }

  private maybeChain(id: IdleMicroId): void {
    const chain = IDLE_CHAINS[id]
    if (!chain || Math.random() > CHAIN_CHANCE) return
    const next = pickRandom(chain)
    const timer = setTimeout(() => {
      if (this.isAmbientEligibleBaseState()) {
        this.behavior.request(this.buildIdleBehavior(next))
      }
    }, 2000 + 150)
    this.idleTimers.push(timer)
  }

  /** Sprint 6.7A-3: base states where stationary ambient micro-behaviour is allowed to surface. */
  private isAmbientEligibleBaseState(): boolean {
    const base = this.stateMachine.baseState
    return base === 'idle' || base === 'studying'
  }

  private showThought(message: string): void {
    clearTimeout(this.thoughtTimer)
    this.thought = message
    this.publish()
    this.thoughtTimer = setTimeout(() => {
      this.thought = null
      this.publish()
    }, AMBIENT_THOUGHT_MS)
  }

  private clearIdleTimers(): void {
    this.idleTimers.forEach((timer) => clearTimeout(timer))
    this.idleTimers = []
  }

  private interruptMovement(): void {
    this.navigation.interrupt()
    this.objectAwareness.clearCurrentAnchor()
  }

  // ---------------- event → reaction mapping ----------------

  private wireEvents(): void {
    const map: Array<[Parameters<typeof characterEvents.on>[0], (event: CharacterEvent) => void]> = [
      ['user-petted',            () => this.actions.pet()],
      ['food-dropped',           () => this.actions.feed()],
      ['toy-dropped',            () => this.actions.play()],
      ['study-session-started',  () => {
        // Sprint 6.7A-4: 'study-session-started' fires both for a fresh
        // start and a resume-from-pause — the only way to tell them
        // apart here is that a paused session is baseState 'sleeping'
        // (pause reuses sleep() below) right up until this handler
        // changes it. Read that BEFORE calling study().
        const resuming = this.stateMachine.baseState === 'sleeping'
        this.actions.study()
        if (resuming) {
          this.scriptedGlance(STUDY_GLANCE_TARGETS.timer)
          this.showThought(pickRandom(STUDY_SPEECH.resume))
        } else {
          const hour = new Date().getHours()
          const isLateNight = hour >= 0 && hour < 4
          if (isLateNight && Math.random() < MIDNIGHT_SPEECH_CHANCE) {
            this.showThought(pickRandom(MIDNIGHT_SPEECH))
          } else {
            this.showThought(pickRandom(STUDY_SPEECH.sessionStart))
          }
        }
      }],
      // A paused session and an on-screen "break" are the same real
      // moment (there's no separate backend break status) — reusing
      // sleep() here means the confirmed Break clip (tea + eyes closed)
      // IS both the pause reaction and the sustained break visual for
      // as long as the timer stays paused, with no new state needed.
      ['timer-paused',           () => {
        this.actions.sleep()
        clearTimeout(this.longFocusTimer)   // Sprint 6.7A-4: paused ≠ still "long focus"
        this.scriptedGlance(STUDY_GLANCE_TARGETS.timer)   // Sprint 6.7A-4: "looks toward the timer when a break starts"
        this.showThought(pickRandom(STUDY_SPEECH.pause))
      }],
      // Local-only pre-session countdown (see CharacterEvent's doc
      // comment) — 'curiosity-pause' is an existing StateToClipMap
      // entry (curious emotion, procedural-only), reused here rather
      // than adding an "anticipating-studying" state for one screen.
      ['study-countdown-started', () => this.actions.setBaseState('curiosity-pause')],
      // Sprint 6.7A-4: "looks toward the webcam briefly after focus
      // recovery" — glance only, no speech (not in the speech-bubble
      // trigger list, deliberately — a recovery moment doesn't need a
      // comment, just a quick acknowledging look).
      ['study-focus-recovered',  () => this.scriptedGlance(STUDY_GLANCE_TARGETS.webcam)],
      // Sprint: smarter focus detection — see CharacterEvent's doc
      // comment. pushOverlay (priority 1, see CharacterStateMachine's
      // registration) means a genuine reaction in progress (feeding,
      // celebrating, being petted — all priority >= 10) always wins;
      // this only shows during otherwise-quiet moments like studying.
      ['posture-nudge-suggested', () => {
        this.stateMachine.pushOverlay('stretching', 4000)
        this.showThought(pickRandom(POSTURE_SPEECH))
      }],
      ['user-tickled', () => {
        // Reuses the same celebrate() sequence a completed session
        // triggers (anticipating-celebrating -> celebrating ->
        // content-celebrating, with the usual bond/routine/memory
        // recording) — tickling deserves the big joyful reaction, not
        // the smaller being-petted bump a single boop gets.
        this.actions.celebrate()
        this.showThought(pickRandom(TICKLE_SPEECH))
      }],
      ['user-double-tapped', () => {
        this.stateMachine.pushOverlay('curiosity-pause', 900)
        this.showThought(pickRandom(DOUBLE_TAP_SPEECH))
      }],
      ['user-held', () => {
        // Deliberately pushes content-petted directly rather than going
        // through actions.pet()'s full anticipating->being-petted->
        // content-petted sequence — a hold IS already the settled,
        // comfortable beat that sequence works up to, so starting there
        // reads as "she's already relaxed into it" rather than
        // re-running the whole build-up for a gesture that's already
        // continuous contact.
        this.stateMachine.pushOverlay('content-petted', 1400)
        this.showThought(pickRandom(HOLD_SPEECH))
      }],
      ['konami-unlocked', () => {
        this.actions.celebrate()
        this.showThought(pickRandom(KONAMI_SPEECH))
      }],
      ['streak-milestone-reached', (event) => {
        this.actions.celebrate()
        const streak = event.type === 'streak-milestone-reached' ? event.streak : 0
        this.showThought(`${streak}-day streak! ♡`)
      }],
      ['study-session-completed', (event) => {
        const classification =
          event.type === 'study-session-completed' ? event.classification : null
        clearTimeout(this.longFocusTimer)   // Sprint 6.7A-4: session over either way
        // An invalid/too-short session settles quietly rather than
        // celebrating — celebrate() is reserved for a result the app
        // itself is calling a genuine win.
        if (classification === 'invalid') {
          this.actions.idle()
          this.showThought(pickRandom(STUDY_SPEECH.completionInvalid))
        } else {
          this.actions.celebrate()
          this.showThought(
            pickRandom(
              classification === 'valid' ? STUDY_SPEECH.completionValid : STUDY_SPEECH.completionPartial,
            ),
          )
          // Sprint 6.7A-4: streak milestone — a light, in-memory count of
          // real completions this visit (see completedStudySessionsThisVisit's
          // doc comment for why this is deliberately not a persisted
          // backend streak). Scheduled just after the completion thought's
          // own display window so the two don't visually collide.
          this.completedStudySessionsThisVisit += 1
          if (this.completedStudySessionsThisVisit % STREAK_MILESTONE_EVERY === 0) {
            const count = this.completedStudySessionsThisVisit
            const timer = setTimeout(() => this.showThought(streakMilestoneMessage(count)), AMBIENT_THOUGHT_MS + 400)
            this.idleTimers.push(timer)
          }
        }
      }],
    ]
    this.unsubscribeEvents = map.map(([type, react]) => characterEvents.on(type, react))
  }

  // ---------------- store contract ----------------

  getSnapshot = (): CharacterSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  dispose(): void {
    this.unsubscribeEvents.forEach((unsubscribe) => unsubscribe())
    this.clearReactionTimers()
    this.clearIdleTimers()
    clearTimeout(this.pettingSettleTimer)
    clearTimeout(this.thoughtTimer)
    clearTimeout(this.longFocusTimer)
    clearTimeout(this.glanceTimer)
    this.unsubscribeGaze?.()
    this.memory.dispose()
    this.presence.dispose()
    this.routine.dispose()
    this.objectAwareness.dispose()
    this.navigation.dispose()
    this.bond.dispose()
    clearTimeout(this.dailyRoutineTimer)
    this.dailyRoutine.dispose()
    this.stateMachine.dispose()
    this.gaze.dispose()
    this.glance.dispose()
    this.listeners.clear()
  }

  // ---------------- reaction choreography ----------------

  private registerReactionStates(): void {
    const reactions = ['eating', 'playing', 'celebrating'] as const
    reactions.forEach((reaction) => {
      const priority = PHASE_PRIORITY[reaction]
      this.stateMachine.registerState({ id: `anticipating-${reaction}`, priority: priority.anticipating })
      this.stateMachine.registerState({ id: reaction,                   priority: priority.action })
      this.stateMachine.registerState({ id: `content-${reaction}`,      priority: priority.content })
    })
    this.stateMachine.registerState({ id: 'being-petted',  priority: PHASE_PRIORITY.pet.action })
    this.stateMachine.registerState({ id: 'content-petted',priority: PHASE_PRIORITY.pet.content })
  }

  /**
   * Sprint 6.4: every one-shot reaction now also records the interaction
   * into RelationshipBond. The bond grows from the same interactions that
   * already create afterglow — they're complementary timescales: afterglow
   * fades in minutes, bond fades in hours.
   *
   * The BehavioralMemory boost multiplier (Sprint 6.0) now also includes
   * a bond contribution: a bonded interaction settles her in slightly
   * faster, composing through the existing `boost` parameter rather than
   * creating a new dependency between BehavioralMemory and RelationshipBond.
   */
  private react(reaction: 'eating' | 'playing' | 'celebrating'): void {
    const timing = REACTION_TIMING[reaction]
    const generation = ++this.reactionGeneration
    this.clearReactionTimers()
    this.clearIdleTimers()
    this.interruptMovement()
    this.routine.recordInteraction(REACTION_MEMORY[reaction])
    this.bond.recordInteraction(REACTION_MEMORY[reaction])   // Sprint 6.4
    // Boost combines routine familiarity AND relationship bond — both
    // independently nudge how quickly comfort grows from this interaction.
    this.memory.record(
      REACTION_MEMORY[reaction],
      1 + 0.4 * this.routine.level + 0.2 * this.bond.strength,  // Sprint 6.4: +bond term
    )
    this.presence.recordInteraction()

    const showAction = () => {
      if (generation !== this.reactionGeneration) return
      const started = this.stateMachine.pushOverlay(reaction, timing.actionMs)
      if (!started) return
      if (timing.settleMs) {
        this.reactionTimers.push(
          setTimeout(() => {
            if (generation === this.reactionGeneration) {
              this.stateMachine.pushOverlay(`content-${reaction}`, timing.settleMs!)
            }
          }, timing.actionMs),
        )
      }
    }

    if (timing.anticipationMs) {
      const started = this.stateMachine.pushOverlay(`anticipating-${reaction}`, timing.anticipationMs)
      if (!started) return
      this.reactionTimers.push(setTimeout(showAction, timing.anticipationMs))
    } else {
      showAction()
    }
  }

  private reactToPetting(): void {
    const timing = REACTION_TIMING.pet
    this.routine.recordInteraction('petted')
    this.bond.recordInteraction('petted')  // Sprint 6.4
    this.memory.record('petted', 1 + 0.4 * this.routine.level + 0.2 * this.bond.strength)
    this.presence.recordInteraction()
    this.interruptMovement()
    this.stateMachine.pushOverlay('being-petted', timing.actionMs)

    clearTimeout(this.pettingSettleTimer)
    if (!timing.settleMs) return
    this.pettingSettleTimer = setTimeout(() => {
      this.stateMachine.pushOverlay('content-petted', timing.settleMs!)
    }, Math.max(0, timing.actionMs - 60))
  }

  private clearReactionTimers(): void {
    this.reactionTimers.forEach((timer) => clearTimeout(timer))
    this.reactionTimers = []
  }

  // ─── Sprint 6.5: Daily Routine scheduling ────────────────────────────────

  /**
   * Start the jittered daily-routine check loop. Uses a `setTimeout` chain
   * rather than `setInterval` so each interval can be independently jittered —
   * a fixed interval would produce a noticeable, clockwork-regular rhythm.
   */
  private startDailyRoutineTimer(): void {
    const scheduleNext = (delayMs: number) => {
      this.dailyRoutineTimer = setTimeout(() => {
        this.tryInitiateDailyActivity()
        // Jitter ±25% around DAILY_ROUTINE_TICK_MS.
        scheduleNext(DAILY_ROUTINE_TICK_MS * (0.75 + Math.random() * 0.5))
      }, delayMs)
    }
    scheduleNext(DAILY_ROUTINE_INITIAL_DELAY_MS)
  }

  /**
   * Ask DailyRoutine whether to initiate an autonomous activity right now.
   * Guards: must be idle with no overlay running. DailyRoutine itself guards
   * the presence stage, cooldowns, and reduced-motion preference.
   */
  private tryInitiateDailyActivity(): void {
    if (this.stateMachine.baseState !== 'idle') return
    if (this.stateMachine.overlayState !== null) return

    const presenceSnapshot = this.presence.snapshot()
    const afterglow = this.memory.dominant

    const activity = this.dailyRoutine.pickActivity({
      baseState: this.stateMachine.baseState,
      presenceStage: presenceSnapshot.stage,
      comfort: this.memory.comfort,
      routineLevel: this.routine.level,
      bondStrength: this.bond.strength,
      reducedMotion: prefersReducedMotion(),
      afterglowKind: afterglow?.kind ?? null,
    })

    if (!activity) return

    const behavior = this.buildDailyActivityBehavior(activity)
    this.behavior.request(behavior)
  }

  /**
   * Map a `DailyActivity` to a `Behavior` using existing machinery.
   *
   * Anchor-based activities wrap `buildAnchorVisitBehavior()`.
   * Micro-behavior activities wrap `buildIdleBehavior()`.
   * Both wrappers inject a cleanup that clears `dailyRoutine.currentActivity`
   * when the behavior finishes (by timeout, completion, or interruption).
   */
  private buildDailyActivityBehavior(activity: DailyActivity): Behavior {
    const clearActivity = () => this.dailyRoutine.setCurrentActivity(null)

    if (activity.anchorId) {
      const anchor = this.objectAwareness.getAnchor(activity.anchorId)
      if (!anchor) {
        // Anchor not found — defensive fallback; should not happen.
        return this.buildIdleBehavior('looking-around')
      }
      const inner = this.buildAnchorVisitBehavior(anchor)
      return {
        ...inner,
        id: `daily-${activity.id}`,
        run: (actions) => {
          this.dailyRoutine.setCurrentActivity(activity.id)
          const cleanup = inner.run(actions)
          return () => {
            cleanup?.()
            clearActivity()
          }
        },
      }
    }

    if (activity.microBehaviorId) {
      const inner = this.buildIdleBehavior(activity.microBehaviorId as IdleMicroId)
      return {
        ...inner,
        id: `daily-${activity.id}`,
        run: (actions) => {
          this.dailyRoutine.setCurrentActivity(activity.id)
          const cleanup = inner.run(actions)
          return () => {
            cleanup?.()
            clearActivity()
          }
        },
      }
    }

    return this.buildIdleBehavior('looking-around')
  }

  // ─────────────────────────────────────────────────────────────────────────

  private buildSnapshot(): CharacterSnapshot {
    const navSnapshot = this.navigation.snapshot()
    return {
      state:              this.stateMachine.displayState,
      baseState:          this.stateMachine.baseState,
      overlayState:       this.stateMachine.overlayState,
      position:           navSnapshot.position,
      afterglow:          this.memory.dominant,
      thought:            this.thought,
      presence:           this.currentEnv(),
      routineFamiliarity: this.routine.snapshot(),
      objectAwareness:    this.objectAwareness.snapshot(),
      movement:           navSnapshot,
      relationship:       this.bond.snapshot(),   // Sprint 6.4
      dailyRoutine:       this.dailyRoutine.snapshot(),  // Sprint 6.5
    }
  }

  private publish(): void {
    this.snapshot = this.buildSnapshot()
    this.listeners.forEach((listener) => listener())
  }
}
