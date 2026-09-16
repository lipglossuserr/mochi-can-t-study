import { useCharacter } from '../react/useCharacter'
import { useSyncExternalStore } from 'react'
import ProceduralLayer from './ProceduralLayer'
import { useRiveCrossfade, CROSSFADE_MS } from './TransitionCompositor'

import { subscribeDiagnostics, getDiagnosticsSnapshot } from './capability/rendererDiagnosticsStore'
import { composeMotion } from './composition/composeMotion'
import { selectAnimationProvider } from './composition/providers'
import type { CharacterRendererProps } from './types'

/**
 * CombinedCharacterRenderer — the one canonical character renderer
 * (6.6D-2: consolidated architecture; 6.7A: Motion Composition — see
 * composition/composeMotion.ts).
 *
 * Composes exactly three collaborators, each with an exclusive, documented
 * slice of what gets drawn — see renderOwnership.ts for the full contract:
 *
 *   - The active Animation-State provider (composition/providers.ts —
 *     today, always RiveCharacterRenderer): sole owner of Animation
 *     State. Drives the .riv file's actual State Machine via its real
 *     inputs (focusLvl1/2/3, focusEnd, food_fish, isPressed) with
 *     defensive fallbacks, and mixes a few extra timelines
 *     (leftandright/upanddown/Idle 2/orange) the machine leaves unused.
 *     Which of those actually happens for a given state is decided by
 *     resolveRenderPath() against the live Capability Registry — the
 *     provider never assumes an input/timeline exists, it checks.
 *   - ProceduralLayer: sole owner of Rotation, Scale, and Effects. Blink,
 *     breathing, gaze/look-tracking, idle micro-variety, emotion glow,
 *     fake-celebrate — always-on DOM/CSS overlay that never touches Rive
 *     internals and never duplicates what the Animation-State provider
 *     does.
 *   - TransitionCompositor (useRiveCrossfade): sole owner of Opacity on
 *     this shared root. Cross-fades whenever the resolved state OR its
 *     render-path tier changes — including a tier *fallback* (e.g. the
 *     state-machine losing an input mid-session), so a capability
 *     downgrade reads as a soft dip, not a snap.
 *
 * Position is NOT this component's concern at all — <Character/>
 * (react/Character.tsx) is the sole owner of that, driven by Navigation.
 *
 * 6.7A — Motion Composition: this component used to independently call
 * `resolveRenderPlan(state)` AND `resolveRenderPath(state, ...)` itself,
 * duplicating work RiveCharacterRenderer had *already done and
 * published* moments earlier, then hand-picked which of five separately-
 * derived values to forward to which child. It now calls
 * `composeMotion()` exactly once and reads every downstream value off
 * the single `VisualComposition` it returns — this component assembles
 * nothing anymore; it composes once and distributes.
 *
 * History: an earlier parallel branch (HybridCharacterRenderer +
 * RiveClipPlayer) bypassed the State Machine entirely and played a fixed
 * list of "confirmed" clip names, built when the machine's reliability
 * was unconfirmed. 6.6D-1 confirmed the machine's inputs are real; 6.6D-2
 * generalized that confirmation into resolveRenderPath's live registry
 * check and deleted the now-redundant Hybrid renderer outright, so there
 * is exactly one Animation State owner instead of two that happened to
 * only ever have one wired at a time.
 */
function CombinedCharacterRenderer({ ariaLabel, state: _stateProp, ...rest }: CharacterRendererProps) {
    // `state` arrives both as a prop (Character.tsx's own useCharacter()
    // read) and is re-derived here via useCharacter() directly — same
    // snapshot, same value, just avoiding a stale-prop dependency. The
    // incoming prop is intentionally discarded so it isn't duplicated
    // when spreading `rest` onto the provider below.
    const { state, movement, objectAwareness, presence } = useCharacter()
    const diagnostics = useSyncExternalStore(subscribeDiagnostics, getDiagnosticsSnapshot)
    const composition = composeMotion(state, diagnostics)
    const { Component: AnimationProvider } = selectAnimationProvider()

    // Sole opacity owner for this root: re-keys (and therefore re-fades)
    // on either a state change or a render-path tier change, so a
    // capability fallback mid-session reads as a soft dip rather than a
    // jump-cut. Neither the Animation-State provider nor ProceduralLayer
    // set opacity on anything at this level.
    const opacity = useRiveCrossfade(`${composition.state}:${composition.path.tier}`)

    return (
        <div
            className="relative h-full w-full"
            style={{
                opacity,
                transition: `opacity ${CROSSFADE_MS / 2}ms ease-in-out`,
            }}
        >
            <AnimationProvider
                state={state}
                ariaLabel={ariaLabel}
                {...rest}
            />

            <div className="pointer-events-none absolute inset-0">
                <ProceduralLayer
                    emotion={composition.plan.emotion}
                    eyesClosed={composition.plan.eyesClosed}
                    isIdleLike={composition.isIdleLike}
                    particles={composition.particles}
                    isStudying={composition.isStudying}
                    movement={movement}
                    objectAwareness={objectAwareness}
                    presence={presence}
                />
            </div>
        </div>
    )
}

export default CombinedCharacterRenderer
