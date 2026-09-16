import CombinedCharacterRenderer from './CombinedCharacterRenderer'
import type { CharacterRenderer } from './types'

/**
 * THE renderer swap point. To move the whole application to a
 * different rendering technology, implement CharacterRenderer and
 * change this one assignment. No screen, hook, or provider changes.
 *
 * History:
 *  - Pre-6.6: RiveCharacterRenderer drove the .riv file's State Machine
 *    directly via its real inputs (focusLvl1/2/3, focusEnd, food_fish,
 *    isPressed), with defensive fallbacks.
 *  - 6.6 (parallel branch, now removed): HybridCharacterRenderer bypassed
 *    the machine entirely, on the working assumption it was unreliable,
 *    and played a small set of confirmed clips by name.
 *  - 6.6D-1: confirmed the machine's real inputs exist; built a
 *    Capability Registry that inspects the loaded asset instead of
 *    assuming.
 *  - 6.6D-2: generalized that confirmation into resolveRenderPath()'s
 *    live, per-state tiered fallback (state-machine → timeline-overlay →
 *    procedural → safe-idle), which made HybridCharacterRenderer and
 *    RiveClipPlayer strictly redundant — deleted outright, along with
 *    the dead `riveClip`/`riveLoop` fields they were the only readers
 *    of. CombinedCharacterRenderer is now the one canonical renderer:
 *    RiveCharacterRenderer owns Animation State, ProceduralLayer owns
 *    Rotation/Scale/Effects, TransitionCompositor owns Opacity, and
 *    Navigation (applied in react/Character.tsx) owns Position. See
 *    capability/renderOwnership.ts for the full contract.
 *  - 6.7A: Motion Composition. CombinedCharacterRenderer no longer
 *    independently re-derives the tier decision or the emotion/eyes/
 *    particle plan — `composition/composeMotion.ts` assembles one
 *    `VisualComposition` per render and every consumer reads from it.
 *    The Animation-State provider itself is now selected via
 *    `composition/providers.ts`'s registry rather than imported by
 *    name, preparing the seam for a future non-Rive provider without
 *    changing this file, CombinedCharacterRenderer, or ProceduralLayer.
 */
export const ActiveCharacterRenderer: CharacterRenderer = CombinedCharacterRenderer

export { toLegacyPetState } from './RiveCharacterRenderer'
export type { CharacterRenderer, CharacterRendererProps } from './types'
export { composeMotion, deriveStudyProps } from './composition/composeMotion'
export { ANIMATION_PROVIDERS, selectAnimationProvider } from './composition/providers'
export type {
    VisualComposition,
    ParticleDirective,
    OverlayDirective,
    AnimationProvider,
    StudyPropId,
    StudyPropDirective,
} from './composition/types'
export { default as StudyPropsLayer } from './StudyPropsLayer'