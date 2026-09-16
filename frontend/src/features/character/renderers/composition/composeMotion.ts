import type { CharacterStateId } from '../../types'
import { resolveRenderPath } from '../capability/resolveRenderPath'
import { resolveRenderPlan, IDLE_LIKE_STATES } from '../StateToClipMap'
import { STATE_OVERLAYS } from '../capability/rendererContract'
import type { RendererDiagnosticsSnapshot } from '../capability/rendererDiagnosticsStore'
import type { StudyPropDirective, VisualComposition } from './types'

/** Sprint 6.7A-3/4: every desk prop appears/disappears together with the study session itself. */
const ALL_STUDY_PROP_IDS: StudyPropDirective['id'][] = ['notebook', 'mug', 'books', 'steam', 'dust', 'lighting']

/**
 * Derive study-room décor directives from state alone — no diagnostics
 * needed, so callers that only care about props (StudyPropsLayer) can
 * use this directly without subscribing to the renderer diagnostics
 * store `composeMotion` otherwise needs for the tier decision.
 */
export function deriveStudyProps(state: CharacterStateId): StudyPropDirective[] {
    const active = state === 'studying'
    return ALL_STUDY_PROP_IDS.map((id) => ({ id, active }))
}

/**
 * composeMotion — the one place a `VisualComposition` gets assembled.
 *
 * Everything here already existed before this sprint; what's new is that
 * it's computed in exactly one place instead of once inside
 * CombinedCharacterRenderer (recomputing `resolveRenderPath`) and again,
 * separately, inside RiveCharacterRenderer (which had *already* computed
 * the same thing and published it).
 *
 * Tier-decision timing note: RiveCharacterRenderer is the only component
 * with a *synchronous* read of the just-loaded Capability Registry (its
 * own `capabilityRef`, populated in the same effect pass that runs its
 * tier decision) — the diagnostics store's copy of that decision always
 * lags it by one publish/re-render cycle. So rather than always trusting
 * the store, this only reuses the store's `renderPath` when it's
 * unambiguously for the state being composed right now
 * (`diagnostics.renderPath.state === state`); on the rare mismatch (a
 * transition mid-flight, or nothing published yet) it falls back to a
 * fresh local call — the exact same pure, cheap function
 * RiveCharacterRenderer itself uses, so the two can never disagree on
 * *how* to decide, only momentarily on *when* the newest answer has
 * propagated. This is strictly more accurate than the pre-refactor
 * code, which recomputed unconditionally against the (always
 * one-cycle-stale) `diagnostics.capability` on every single render.
 */
export function composeMotion(
    state: CharacterStateId,
    diagnostics: RendererDiagnosticsSnapshot,
): VisualComposition {
    const path =
        diagnostics.renderPath && diagnostics.renderPath.state === state
            ? diagnostics.renderPath
            : resolveRenderPath(state, diagnostics.capability)

    const plan = resolveRenderPlan(state)

    const overlay = {
        timelines: path.tier === 'timeline-overlay' ? STATE_OVERLAYS[state] ?? [] : [],
    }

    const particles = [{ id: 'fake-celebrate-bounce' as const, active: Boolean(plan.fakeCelebrate) }]

    return {
        state,
        path,
        plan,
        overlay,
        particles,
        studyProps: deriveStudyProps(state),
        isIdleLike: IDLE_LIKE_STATES.has(state),
        isStudying: state === 'studying',
    }
}
