/**
 * rendererContract — Sprint 6.6D-1, extended 6.6D-2.
 *
 * The single source of truth for what RiveCharacterRenderer.tsx assumes
 * the .riv asset provides, PLUS (6.6D-2) which specific input(s) each
 * state-machine-handled state actually needs to enter — the previous
 * version only had a flat list of every input this file touches
 * anywhere, which was enough for a load-time inventory check but not
 * enough to answer "can THIS state actually use the state-machine tier
 * right now?", which resolveRenderPath.ts needs per-state, not just
 * globally.
 */
import type { CharacterStateId, KnownCharacterState } from '../../types'
import type { IdleMicroId } from '../../engine/CharacterEngine'

/** Overlay timelines mixed on top of the machine, per engine state. */
export const STATE_OVERLAYS: Record<string, string[]> = {
    'looking-around': ['leftandright'],
    'following-cursor': ['leftandright'],
    'curiosity-pause': ['leftandright'],
    stretching: ['upanddown'],
    yawning: ['upanddown'],
    sleeping: ['Idle 2'],
    happy: ['upanddown'],
    playing: ['upanddown', 'leftandright'],
    celebrating: ['upanddown', 'leftandright'],
    /**
     * Shop v1.1 / bug report: the plain resting state had no Rive-side
     * overlay at all before this — it always fell through to
     * ProceduralLayer's CSS-only rest pose (StateToClipMap's
     * `idle: restPlan('neutral')`), even though the asset has a genuine,
     * previously-unused 'Idle' timeline distinct from 'Idle 2' (see that
     * REFERENCED_TIMELINES entry's comment for how the two were told
     * apart — 'Idle' and 'Idle 2' are two different, real timelines, not
     * a naming mismatch). This is what gives plain idle a subtly
     * different, slightly bored-looking loop instead of always reading
     * as the exact same pose 'sleeping' uses.
     */
    idle: ['Idle'],
}

/**
 * States handled explicitly in RiveCharacterRenderer's switch (studying/
 * eating/being-petted drive machine inputs directly rather than via
 * STATE_OVERLAYS). Exported so the capability validator can tell "no
 * Rive-side mapping at all" apart from "handled, just not via the
 * overlay table."
 */
export const STATE_MACHINE_HANDLED_STATES = ['studying', 'eating', 'being-petted'] as const

/** Every state-machine input name RiveCharacterRenderer references, primary + fallback. */
export const REFERENCED_INPUTS: Array<{ primary: string; fallback?: string }> = [
    { primary: 'focusLvl1' },
    { primary: 'focusLvl2' },
    { primary: 'focusLvl3' },
    { primary: 'focusEnd' },
    { primary: 'food_fish', fallback: 'Food_Spawn_Fish' },
    { primary: 'isPressed', fallback: 'Trigger 1' },
]

/**
 * Every timeline name RiveCharacterRenderer plays as a machine-independent
 * overlay. 'orange'/'calico'/'white' are the asset's three one-shot skin
 * variants (Shop v1.1 — see SKIN_TIMELINES in RiveCharacterRenderer.tsx
 * for how the pet's equipped-skin itemKey resolves to one of these);
 * 'Idle' (distinct from 'Idle 2' — verified byte-for-byte against the raw
 * asset, not a typo of it) is the plain-idle overlay above.
 */
export const REFERENCED_TIMELINES = [
    'orange',
    'calico',
    'white',
    'leftandright',
    'upanddown',
    'Idle',
    'Idle 2',
] as const

/**
 * The specific input(s) each state-machine-handled state needs to enter
 * at all (not every input that state touches over its lifetime — e.g.
 * `studying`'s focusLvl2/focusLvl3/focusEnd are escalation/exit inputs
 * fired later, not required just to *start* studying). resolveRenderPath
 * uses this to decide, per state, whether the state-machine tier is
 * actually usable right now — a global "is focusLvl2 missing" warning
 * doesn't tell you whether `studying` itself still works.
 */
export const STATE_REQUIRED_INPUTS: Partial<Record<CharacterStateId, Array<{ primary: string; fallback?: string }>>> = {
    studying: [{ primary: 'focusLvl1' }],
    eating: [{ primary: 'food_fish', fallback: 'Food_Spawn_Fish' }],
    'being-petted': [{ primary: 'isPressed', fallback: 'Trigger 1' }],
}

/**
 * The full semantic state vocabulary CharacterEngine can emit, built
 * from the two exported union types rather than hand-duplicated — if a
 * future sprint adds a state to either union, it lands here for free
 * the next time TypeScript is happy (this array is manually kept in
 * literal sync with those two unions; a mismatch is a compile-time
 * signal to update it, not a runtime one, since TS unions can't be
 * reflected into a value array automatically).
 */
const ALL_KNOWN_STATES: CharacterStateId[] = [
    'idle',
    'happy',
    'studying',
    'sleeping',
    'eating',
    'playing',
    'celebrating',
    'following-cursor',
    'being-petted',
    'anticipating-eating',
    'content-eating',
    'anticipating-playing',
    'content-playing',
    'anticipating-celebrating',
    'content-celebrating',
    'content-petted',
    'curiosity-pause',
    'observing-room',
] satisfies KnownCharacterState[]

const ALL_IDLE_MICRO_STATES: CharacterStateId[] = [
    'stretching',
    'yawning',
    'looking-around',
    'curiosity-pause',
    'ambient-thought',
    'observing-room',
] satisfies IdleMicroId[]

export const ALL_SEMANTIC_STATES: CharacterStateId[] = Array.from(
    new Set([...ALL_KNOWN_STATES, ...ALL_IDLE_MICRO_STATES]),
)
