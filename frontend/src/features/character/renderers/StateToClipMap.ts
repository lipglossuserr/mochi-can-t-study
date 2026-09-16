import type { CharacterStateId } from '../types'

/**
 * StateToClipMap — Sprint 6.6, revised 6.6D-2.
 *
 * The single editable table connecting every state the engine can put
 * on screen to what the *procedural* render tier shows for it —
 * emotion overlay, eyes-open/closed, and the fake-celebrate stand-in.
 * ProceduralLayer only knows how to run a micro-animation; this table
 * is the only place that knows which one goes with which state.
 *
 * 6.6D-2 removed the `riveClip`/`riveLoop` fields this table used to
 * carry: those existed only for HybridCharacterRenderer (which played
 * confirmed Rive clips by name, bypassing the State Machine). That
 * renderer and its RiveClipPlayer were deleted in 6.6D-2 — the
 * capability-driven resolveRenderPath() now supersedes the whole
 * "confirmed clip name" concept with a live registry check, so a
 * second, hand-maintained confirmed-clip list here would just be a
 * duplicate, drifting source of truth. See
 * renderers/capability/resolveRenderPath.ts and renderOwnership.ts.
 *
 * KNOWN GAP — worth flagging rather than working around: the engine
 * currently emits exactly one `studying` state. The .riv asset has
 * three focus intensities (Fokus_lvl_1/2/3 in the machine's own
 * timeline names) but there is no upstream signal (e.g. session
 * duration, focus score) that says which one to show — the machine's
 * own escalation timers in RiveCharacterRenderer.tsx handle this on
 * the Rive side already; this table's `emotion`/`eyesClosed` fields
 * don't need to know about that escalation at all.
 */

export type EmotionCue = 'happy' | 'curious' | 'sleepy' | 'calm' | 'neutral'

export interface RenderPlan {
    /** Lightweight emotion-overlay vocabulary (Sprint 6.5's semantic states) — never facial deformation. */
    emotion: EmotionCue
    /** Suppresses pupil/eye tracking while true (matches which states show Mochi with eyes shut). */
    eyesClosed: boolean
    /** Runs the Fake Celebrate stand-in (scale-bounce + happy overlay, composed with whatever the Rive tier is doing). */
    fakeCelebrate?: boolean
    /**
     * True for entries with no dedicated Synfig/Rive asset behind them
     * at all — fully procedural stand-ins Sprint 6.7 is expected to
     * replace outright.
     */
    temporaryStandIn?: boolean
}

const restPlan = (emotion: EmotionCue, eyesClosed = false): RenderPlan => ({
    emotion,
    eyesClosed,
})

export const STATE_TO_CLIP_MAP: Record<string, RenderPlan> = {
    idle: restPlan('neutral'),

    // Sprint 6.7 TODO: replace with a real happy/joy Synfig clip.
    happy: { ...restPlan('happy'), temporaryStandIn: true },

    studying: { emotion: 'curious', eyesClosed: false },

    sleeping: { emotion: 'sleepy', eyesClosed: true },

    // No confirmed eating clip exists (Food_area_hit_* is unverified) —
    // Sprint 6.7 TODO: replace with a real eating Synfig clip.
    eating: { ...restPlan('happy'), temporaryStandIn: true },

    playing: { emotion: 'happy', eyesClosed: false },

    // Sprint 6.7 TODO: replace with a dedicated celebration Synfig clip;
    // composes with the procedural scale-bounce and happy emotion
    // overlay as a temporary stand-in.
    celebrating: {
        emotion: 'happy',
        eyesClosed: false,
        fakeCelebrate: true,
        temporaryStandIn: true,
    },

    'following-cursor': restPlan('curious'),

    // Sprint 6.7 TODO: replace with a real petting-response Synfig clip.
    'being-petted': { ...restPlan('calm'), temporaryStandIn: true },
    'content-petted': { ...restPlan('calm'), temporaryStandIn: true },

    // Reaction bookends — no dedicated clips; Sprint 6.7 TODO likewise.
    'anticipating-eating': { ...restPlan('curious'), temporaryStandIn: true },
    'content-eating': { ...restPlan('calm'), temporaryStandIn: true },
    'anticipating-playing': { ...restPlan('curious'), temporaryStandIn: true },
    'content-playing': { emotion: 'calm', eyesClosed: false },
    'anticipating-celebrating': { ...restPlan('curious'), temporaryStandIn: true },
    'content-celebrating': { ...restPlan('calm'), temporaryStandIn: true },

    'curiosity-pause': { emotion: 'curious', eyesClosed: false },
    'observing-room': { emotion: 'curious', eyesClosed: false },

    // Sprint 6.5 daily-routine idle micro-behaviors — these are real
    // runtime overlay states pushed by CharacterEngine.buildIdleBehavior
    // (see engine/CharacterEngine.ts, IdleMicroId union). Four of these
    // aren't declared in the KnownCharacterState union; all four land
    // here (a Sprint 6.6 QA pass found 'ambient-thought' had been missed
    // — CharacterEngine actively weights it by bond strength and routine
    // familiarity, so it is not a rare edge case worth silently falling
    // back to generic idle).
    'looking-around': { emotion: 'neutral', eyesClosed: false },
    // No confirmed stretch/yawn clips — Sprint 6.7 TODO.
    stretching: { ...restPlan('neutral'), temporaryStandIn: true },
    yawning: { ...restPlan('sleepy', true), temporaryStandIn: true },
    // Bonded companion's quiet-thinking micro-behavior (DailyRoutine.ts).
    // No confirmed dedicated clip — Sprint 6.7 TODO: replace with a real
    // "thinking/quiet" Synfig clip. Curious+neutral eyes reads reasonably
    // as a placeholder in the meantime.
    'ambient-thought': { ...restPlan('curious'), temporaryStandIn: true },
}

/**
 * Resolve a plan for any state the engine hands us. Unknown/future
 * state strings fall back to `idle`'s plan rather than a blank frame —
 * per this sprint's checklist, nothing is allowed to be a silent no-op.
 */
export function resolveRenderPlan(state: CharacterStateId): RenderPlan {
    return STATE_TO_CLIP_MAP[state] ?? STATE_TO_CLIP_MAP.idle
}

/** States where idle micro-variety (posture sway, ear-flick pulse) is allowed to run. */
export const IDLE_LIKE_STATES = new Set<string>([
    'idle',
    'following-cursor',
    'curiosity-pause',
    'observing-room',
    'looking-around',
    'ambient-thought',
])
