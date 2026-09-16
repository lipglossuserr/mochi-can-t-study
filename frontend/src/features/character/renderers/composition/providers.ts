import RiveCharacterRenderer from '../RiveCharacterRenderer'
import type { AnimationProvider } from './types'

/**
 * composition/providers — the registry of Animation-State backends.
 *
 * Exactly one provider exists today: Rive, driving `mochi.riv`'s State
 * Machine (state-machine/timeline-overlay tiers) with its own internal
 * procedural/safe-idle handling for the tiers where the .riv asset can't
 * carry a state (see RiveCharacterRenderer.tsx's tier switch). It is
 * still the sole owner of Animation State (capability/renderOwnership.ts,
 * unchanged) — this registry doesn't change that, it documents it as
 * data instead of leaving it implicit in `renderers/index.ts`'s single
 * assignment.
 *
 * To add a second provider (a Synfig-exported asset, a sprite-sheet
 * fallback, anything else):
 *
 *   1. Implement `CharacterRenderer` (renderers/types.ts) — same
 *      contract Rive already satisfies: `state` in, JSX out, decorative
 *      hints (`afterglow`/`presence`/`routineFamiliarity`) optional.
 *   2. Decide which `RenderTier`s it can realize. The current four names
 *      (`state-machine`, `timeline-overlay`, `procedural`, `safe-idle`)
 *      describe *Rive's own* mechanisms specifically — a Synfig provider
 *      would likely need its own tier vocabulary for whatever its own
 *      capability spectrum looks like (e.g. "named clip" vs "layer
 *      blend"), with `procedural`/`safe-idle` as the two tiers every
 *      provider can reasonably be expected to share, since ProceduralLayer
 *      and the safe-idle net are already asset-independent.
 *   3. Register the new entry below. Nothing about
 *      `CombinedCharacterRenderer`, `composeMotion`, or ProceduralLayer
 *      needs to change to add an entry — they only reason about the
 *      *result* of a tier decision, never about which provider produced
 *      it.
 *
 * Actually swapping *which* provider is active for a given state is
 * intentionally not implemented here — with one provider there is
 * nothing to select between yet, and building a selection mechanism
 * against a single real data point would be speculative. `resolveRenderPath`
 * is where that selection would plug in once a second provider exists.
 */
export const ANIMATION_PROVIDERS: AnimationProvider[] = [
    {
        id: 'rive',
        label: 'Rive — mochi.riv, "State Machine 1"',
        tiers: ['state-machine', 'timeline-overlay', 'procedural', 'safe-idle'],
        Component: RiveCharacterRenderer,
    },
]

/**
 * The provider CombinedCharacterRenderer actually mounts for Animation
 * State. With exactly one entry, selection is trivial — this function
 * exists so that trivial-ness is a one-line body a future second
 * provider replaces (e.g. "prefer Synfig if its asset loaded, else fall
 * back to Rive"), not a call site scattered across CombinedCharacterRenderer.
 */
export function selectAnimationProvider(): AnimationProvider {
    return ANIMATION_PROVIDERS[0]
}
