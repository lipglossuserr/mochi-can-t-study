/**
 * Character Engine — shared types.
 *
 * This module is the vocabulary of the whole engine. Nothing in here
 * mentions Rive, SVG, or any other rendering technology: the engine
 * deals in *semantic* states, actions, and events, and renderers
 * translate those into whatever their technology understands.
 */

export type KnownCharacterState =
    | 'idle'
    | 'happy'
    | 'studying'
    | 'sleeping'
    | 'eating'
    | 'playing'
    | 'celebrating'
    | 'following-cursor'
    | 'being-petted'
    | 'anticipating-eating'
    | 'content-eating'
    | 'anticipating-playing'
    | 'content-playing'
    | 'anticipating-celebrating'
    | 'content-celebrating'
    | 'content-petted'
    | 'curiosity-pause'
    | 'observing-room'


export type CharacterStateId = KnownCharacterState | (string & {})

export type MemoryKind = 'fed' | 'played' | 'petted' | 'celebrated'

export interface AfterglowState {
    kind: MemoryKind
    phase: 'fresh' | 'fading'
}

export type PresenceStage = 'active' | 'settled' | 'quiet' | 'deep-quiet'

export interface RoomPresenceSnapshot {
    stage: PresenceStage
    activityLevel: number
    comfort: number
}

export interface RoutineFamiliaritySnapshot {
    level: number
}

export interface ObjectAwarenessSnapshot {
    currentAnchor: string | null
}

export type MovementState = 'stationary' | 'walking' | 'arriving'

export type MovementDirection = 'left' | 'right'

export interface MovementSnapshot {
    state: MovementState
    position: CharacterPosition | null
    direction: MovementDirection | null
    progress: number
}

/**
 * Relationship bond (Sprint 6.4): how deep the connection between Mochi
 * and this player has grown over the current session. Starts at 0 for
 * every new session (no persistence), grows slowly through interactions,
 * and decays very slowly during long absences — "slightly cool without
 * resetting" per the brief.
 *
 * This is a BIAS signal only, never a gate or a visible label. The
 * `phase` field provides a semantic label so renderers and behavior
 * weighting can scale their responses without hard-coding threshold
 * comparisons in multiple places.
 *
 * RIVE COMPATIBILITY: `bond` maps to a continuous Number input;
 * `phase` maps to a String/enum input for discrete expression blending.
 */
export type RelationshipPhase = 'new' | 'warming' | 'familiar' | 'bonded'

export interface RelationshipBondSnapshot {
    /**
     * 0..1 — accumulated bond strength, lazily decayed. 0 = brand-new
     * companion (first interactions of a session), 1 = deeply bonded
     * (sustained, engaged session). Never shown to the player.
     */
    bond: number
    /**
     * Semantic phase derived from `bond`. Renderers use this to scale
     * expression amplitude (warmer at 'bonded', more reserved at 'new')
     * without exposing the raw number to display logic.
     */
    phase: RelationshipPhase
}

export interface DailyRoutineSnapshot {
    /**
     * Sprint 6.5: autonomous daily activity Mochi is currently performing,
     * or null when no daily-routine behavior is executing.
     * Semantic vocabulary only — never rendered as a label, progress bar,
     * or UI element. RIVE: maps to a discrete String input.
     */
    currentActivity: string | null
}

export interface CharacterStateDefinition {
    id: CharacterStateId
    priority: number
}

export type CharacterEvent =
    | { type: 'user-petted' }
    | { type: 'food-dropped' }
    | { type: 'toy-dropped' }
    | { type: 'study-session-started' }

    /**
     * Sprint: Study Room integration. Fired for the local pre-session
     * countdown (a client-only UX beat — the backend session doesn't
     * exist yet at this point) so Mochi reads as anticipating rather
     * than static while the countdown runs.
     */
    | { type: 'study-countdown-started' }
    /**
     * `classification` mirrors the backend's SessionClassification
     * (VALID/PARTIAL/INVALID) but deliberately as a lowercase, engine-
     * local union rather than importing that DTO type here — the
     * character feature stays decoupled from any one feature's backend
     * shape. `null` covers callers that haven't finalized a result
     * (defensive; StudyRoomPage always has one by the time this fires).
     */
    | { type: 'study-session-completed'; classification: 'valid' | 'partial' | 'invalid' | null }
    | { type: 'timer-paused' }
    /**
     * Sprint 6.7A-4: the webcam focus tracker's cameraState just returned
     * to FOCUSED after being DISTRACTED/NO_FACE/MULTIPLE_FACES. Drives a
     * brief scripted glance toward the webcam — no speech, just a desk
     * interaction (see CharacterEngine's STUDY_GLANCE_TARGETS).
     */
    | { type: 'study-focus-recovered' }
    | { type: 'study-focus-recovered' }
    | { type: 'konami-unlocked' }
    | { type: 'streak-milestone-reached' }
    | { type: 'posture-nudge-suggested' }



export type CharacterEventType = CharacterEvent['type']

export interface CharacterPosition {
    x: number
    y: number
    anchor?: 'desk' | 'bed' | 'bowl' | 'window' | 'center' | 'bookshelf' | 'plant' | 'cushion' | (string & {})
}

export interface CharacterSnapshot {
    state: CharacterStateId
    baseState: CharacterStateId
    overlayState: CharacterStateId | null
    /**
     * Sprint 6.3: interpolated position from NavigationController.
     * Updates ~20fps during movement; null when stationary at layout default.
     */
    position: CharacterPosition | null
    afterglow: AfterglowState | null
    thought: string | null
    presence: RoomPresenceSnapshot
    routineFamiliarity: RoutineFamiliaritySnapshot
    objectAwareness: ObjectAwarenessSnapshot
    /**
     * Sprint 6.5: see `DailyRoutineSnapshot`.
     * Sprint 6.3: rich movement data — state, direction, progress.
     * Additive over `position`; renderers that only need coordinates
     * can keep reading `position` unchanged.
     */
    movement: MovementSnapshot
    /**
     * Sprint 6.4: relationship bond depth. A bias signal for renderers
     * (warmer expression, more confidence at high bond) and behavior
     * weighting. Never rendered as a number, bar, or label.
     */
    relationship: RelationshipBondSnapshot
    /**
     * Sprint 6.5: daily routine state. Populated while a DailyRoutine-
     * initiated behavior is executing; `currentActivity` is null otherwise.
     */
    dailyRoutine: DailyRoutineSnapshot
}

export interface Behavior {
    id: string
    priority: number
    run: (actions: CharacterActions) => void | (() => void)
    durationMs?: number
}

export interface CharacterActions {
    feed: () => void
    play: () => void
    pet: () => void
    celebrate: () => void
    sleep: () => void
    study: () => void
    idle: () => void
    setBaseState: (state: CharacterStateId) => void
    moveTo: (position: CharacterPosition) => void
    resetPosition: () => void
}
