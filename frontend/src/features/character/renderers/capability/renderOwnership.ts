/**
 * renderOwnership — Sprint 6.6D-2.
 *
 * The character's on-screen appearance is produced by four independent
 * systems (Navigation, RiveCharacterRenderer, ProceduralLayer,
 * TransitionCompositor). This table is the single, explicit statement
 * of which one is allowed to write which visual property — written down
 * so a future change has something concrete to check against instead of
 * relying on nobody happening to add a second writer.
 *
 * This is a documentation-and-reference contract, not a runtime
 * enforcement mechanism (there's no practical way to intercept arbitrary
 * CSS/canvas writes across three independent libraries — Motion, the
 * Rive runtime, and plain React state — without wrapping all three in a
 * much heavier abstraction that this sprint's "no new features" scope
 * doesn't call for). What IS enforced by the actual code: every property
 * below is written from exactly one file, and that file is named here so
 * a reviewer can grep for a second writer appearing anywhere else.
 */

export type RenderProperty =
    | 'position'
    | 'rotation'
    | 'scale'
    | 'opacity'
    | 'animationState'
    | 'effects'

export type RenderOwner = 'Navigation' | 'RiveCharacterRenderer' | 'ProceduralLayer' | 'TransitionCompositor'

export interface OwnershipEntry {
    owner: RenderOwner
    /** The one file that actually writes this property. */
    appliedIn: string
    note: string
}

export const RENDER_OWNERSHIP: Record<RenderProperty, OwnershipEntry> = {
    position: {
        owner: 'Navigation',
        appliedIn: 'react/Character.tsx',
        note:
            'Room-space left/top percentage, computed by the Navigation system (behavior/Navigation), ' +
            'applied only in the <Character/> wrapper — not inside CombinedCharacterRenderer or either of ' +
            'its children. ProceduralLayer\'s gaze "look" offset is a separate few-px nudge within the ' +
            'character\'s own frame (see `rotation`/`effects` below), not room position, and is documented ' +
            'as such at its call site to avoid this exact ambiguity.',
    },
    rotation: {
        owner: 'ProceduralLayer',
        appliedIn: 'ProceduralLayer.tsx',
        note:
            'Idle sway and walk-tilt. Neither RiveCharacterRenderer (the Rive canvas draws itself, this app ' +
            'never rotates its container) nor TransitionCompositor (opacity only) ever rotate the shared root.',
    },
    scale: {
        owner: 'ProceduralLayer',
        appliedIn: 'ProceduralLayer.tsx',
        note:
            'Breathing pulse and the fake-celebrate bounce. Same exclusivity as rotation — nothing else ' +
            'scales the root.',
    },
    opacity: {
        owner: 'TransitionCompositor',
        appliedIn: 'renderers/TransitionCompositor.tsx (useRiveCrossfade), consumed in CombinedCharacterRenderer.tsx',
        note:
            'Cross-fades the whole character root when the resolved state OR its render-path tier changes ' +
            '(see resolveRenderPath.ts) — a capability fallback mid-session dips rather than snaps. ' +
            'ProceduralLayer animates opacity on its OWN internal decorative elements (the emotion glow, the ' +
            'blink pinch) — that is `effects` ownership at a sub-element level, not root opacity, and is a ' +
            'deliberately different concern from this entry.',
    },
    animationState: {
        owner: 'RiveCharacterRenderer',
        appliedIn: 'RiveCharacterRenderer.tsx',
        note:
            'Which state-machine input, overlay timeline, or "leave it at rest" applies — decided exclusively ' +
            'by resolveRenderPath() and executed exclusively by this file. CombinedCharacterRenderer mounts it ' +
            'via composition/providers.ts\'s `selectAnimationProvider()` rather than importing it directly ' +
            '(6.7A, Motion Composition) — an indirection, not a change of owner: exactly one provider is ' +
            'registered today, so selection is currently trivial, and the file that writes Animation State is ' +
            'still this same one. The earlier competing implementation (HybridCharacterRenderer + ' +
            'RiveClipPlayer, which played Rive clips by name via a different code path) was deleted in 6.6D-2 ' +
            'specifically to remove the possibility of two Animation State owners existing at once, even ' +
            'though only one was ever wired live at a time via renderers/index.ts.',
    },
    effects: {
        owner: 'ProceduralLayer',
        appliedIn: 'ProceduralLayer.tsx',
        note:
            'Emotion glow, blink overlay, fake-celebrate visual. Not applied anywhere else in the renderer stack.',
    },
}
