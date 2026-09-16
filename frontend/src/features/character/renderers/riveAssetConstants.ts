/**
 * riveAssetConstants — facts about the mochi.riv asset itself, kept as
 * their own module rather than inlined in RiveCharacterRenderer.tsx.
 * Originally split out because a second Rive consumer (`RivePet`, since
 * removed as dead code — see riveInputBridge.ts's header comment for
 * the full history) had its own hand-maintained, drifted copy of these
 * same facts, which is exactly how the PetStateMachine bug happened.
 * Kept extracted even with a single consumer today, for the same
 * reason riveInputBridge.ts stays extracted: so a future second
 * consumer starts from one verified source instead of a fresh guess.
 */

/** Study-session focus escalation (ms into 'studying'). */
export const FOCUS_LEVEL_2_AFTER_MS = 3 * 60 * 1000
export const FOCUS_LEVEL_3_AFTER_MS = 8 * 60 * 1000

/**
 * Shop v1.1: mochi.riv's three one-shot skin timelines, keyed by the
 * SKIN item's itemKey (see Pet.equippedSkinItemKey on the backend).
 * 'orange' was always played unconditionally before this — 'calico'
 * and 'white' are real, previously-unused timelines confirmed the same
 * way 'orange' itself was: same length-prefixed name + ~900-byte
 * curve-data shape in the raw asset (see the bug report thread this
 * shipped from for the byte-offset evidence).
 */
export const SKIN_TIMELINES: Record<string, string> = {
    'skin-orange': 'orange',
    'skin-calico': 'calico',
    'skin-white': 'white',
}
export const DEFAULT_SKIN_TIMELINE = 'orange'

export function resolveSkinTimeline(skin: string | null | undefined): string {
    if (!skin) return DEFAULT_SKIN_TIMELINE
    return SKIN_TIMELINES[skin] ?? DEFAULT_SKIN_TIMELINE
}

/**
 * The plain resting-idle overlay (distinct from 'Idle 2', which
 * `sleeping` uses) — see rendererContract.ts's `STATE_OVERLAYS.idle`
 * entry for how the two names were verified as genuinely different,
 * real timelines rather than one mistyped as the other.
 */
export const IDLE_BORED_TIMELINE = 'Idle'
