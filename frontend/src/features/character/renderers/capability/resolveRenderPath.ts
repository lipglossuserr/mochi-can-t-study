import type { CharacterStateId } from '../../types'
import type { CapabilitySnapshot } from './RendererCapabilityRegistry'
import { STATE_TO_CLIP_MAP } from '../StateToClipMap'
import {
    STATE_OVERLAYS,
    STATE_MACHINE_HANDLED_STATES,
    STATE_REQUIRED_INPUTS,
} from './rendererContract'

/**
 * resolveRenderPath — Sprint 6.6D-2.
 *
 * Resolves, for a given semantic state, the single best render path this
 * app can actually deliver *right now* — checked against the live
 * Capability Registry, not assumed from a hand-written map. This is the
 * one function every renderer decision in this file goes through; there
 * is no second place that independently decides "does this state have a
 * Rive capability."
 *
 * Tier priority (state-machine > timeline-overlay > procedural >
 * safe-idle) is the one thing that IS a fixed design decision — a
 * state-machine-authored motion is richer than a raw timeline mix, which
 * is richer than a procedural placeholder. What's never assumed is
 * AVAILABILITY at each tier: that's always read from `registry`, live,
 * every call. A future asset that adds Data Binding ViewModel properties,
 * or drops an input this file currently relies on, changes the resolved
 * tier automatically — nothing here needs editing for that.
 *
 * Pure function: same (state, registry) always resolves to the same one
 * tier. No side effects, no rendering — RiveCharacterRenderer and
 * CombinedCharacterRenderer call this and act on the result; this file
 * only decides.
 */

export type RenderTier = 'state-machine' | 'timeline-overlay' | 'procedural' | 'safe-idle'

export interface RenderPathDecision {
    state: CharacterStateId
    tier: RenderTier
    /** Human-readable reason, surfaced in dev diagnostics and console warnings. */
    reason: string
}

function hasInput(registry: CapabilitySnapshot, name: string): boolean {
    const lower = name.toLowerCase()
    // A Data Binding ViewModel property (see RendererCapabilityRegistry.ts /
    // ViewModelBridge in RiveCharacterRenderer.tsx) drives the machine
    // just as validly as a classic Input — mochi.riv exposes focusLvl1/2/3,
    // focusEnd, food_fish/Food_Spawn_Fish, and isPressed this way.
    return (
        registry.inputs.some((input) => input.name.toLowerCase() === lower) ||
        registry.viewModel.properties.some((prop) => prop.toLowerCase() === lower)
    )
}

function hasTimeline(registry: CapabilitySnapshot, name: string): boolean {
    return registry.timelines.some((timeline) => timeline.toLowerCase() === name.toLowerCase())
}

/**
 * Whether the state-machine tier is genuinely usable for `state` right
 * now: true only if every input STATE_REQUIRED_INPUTS lists for it (by
 * primary name OR its documented fallback) is actually present on the
 * live registry.
 */
function stateMachineTierAvailable(state: CharacterStateId, registry: CapabilitySnapshot): boolean {
    const required = STATE_REQUIRED_INPUTS[state]
    if (!required || required.length === 0) return false
    return required.every(({ primary, fallback }) => hasInput(registry, primary) || (fallback ? hasInput(registry, fallback) : false))
}

/**
 * Whether the timeline-overlay tier is genuinely usable for `state`
 * right now: true only if every timeline STATE_OVERLAYS lists for it is
 * actually present on the live registry. Partial availability (e.g.
 * `playing` lists two timelines and only one exists) intentionally does
 * NOT count as available — a half-applied overlay is worse than a clean
 * fallback to procedural, and "exactly one render path" would otherwise
 * be ambiguous about which half is "the" path.
 */
function timelineTierAvailable(state: CharacterStateId, registry: CapabilitySnapshot): boolean {
    const names = STATE_OVERLAYS[state]
    if (!names || names.length === 0) return false
    return names.every((name) => hasTimeline(registry, name))
}

function proceduralTierAvailable(state: CharacterStateId): boolean {
    return Object.prototype.hasOwnProperty.call(STATE_TO_CLIP_MAP, state)
}

export function resolveRenderPath(
    state: CharacterStateId,
    registry: CapabilitySnapshot | null,
): RenderPathDecision {
    const isStateMachineCandidate = (STATE_MACHINE_HANDLED_STATES as readonly string[]).includes(state)
    const isTimelineCandidate = Boolean(STATE_OVERLAYS[state])

    if (registry) {
        if (isStateMachineCandidate && stateMachineTierAvailable(state, registry)) {
            return { state, tier: 'state-machine', reason: 'Required input(s) confirmed on live registry.' }
        }
        if (isTimelineCandidate && timelineTierAvailable(state, registry)) {
            return { state, tier: 'timeline-overlay', reason: 'Required timeline(s) confirmed on live registry.' }
        }
        if (isStateMachineCandidate || isTimelineCandidate) {
            // The intended tier for this state exists in code but the
            // asset doesn't actually back it — this is exactly the
            // "automatic fallback" case, not a bug: fall through.
        }
    }
    // registry === null: asset hasn't loaded yet (or failed to). Can't
    // confirm state-machine/timeline capability either way, so don't
    // claim one — fall straight to procedural, which needs no Rive asset
    // at all and is always safe to show while loading.

    if (proceduralTierAvailable(state)) {
        return {
            state,
            tier: 'procedural',
            reason: registry
                ? 'No usable Rive-side capability for this state; procedural overlay carries it.'
                : 'Rive asset not yet loaded; procedural overlay carries it in the meantime.',
        }
    }

    return {
        state,
        tier: 'safe-idle',
        reason: `No renderer capability at any tier for state "${state}" — showing safe idle.`,
    }
}
