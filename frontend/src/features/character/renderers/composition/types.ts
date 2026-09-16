import type { ComponentType } from 'react'
import type { CharacterStateId } from '../../types'
import type { RenderPathDecision, RenderTier } from '../capability/resolveRenderPath'
import type { RenderPlan } from '../StateToClipMap'
import type { CharacterRendererProps } from '../types'

/**
 * composition/types — Motion Composition architecture (this sprint).
 *
 * Before this sprint, "what should be on screen right now" was several
 * independent facts (tier decision, emotion/eyes plan, which overlay
 * timelines are live, whether the celebrate bounce should run) each
 * re-derived, separately, by whichever component happened to need one of
 * them — CombinedCharacterRenderer re-ran `resolveRenderPath` itself
 * *in addition to* RiveCharacterRenderer already having run it and
 * published the answer; ProceduralLayer received a single hardcoded
 * `fakeCelebrate: boolean` prop that had no room for a second directive
 * without a new prop and a new call site edit everywhere it's rendered.
 *
 * `VisualComposition` is the fix: one object, produced once per render
 * by `composeMotion()`, that every consumer reads from instead of
 * re-deriving its own slice. It does not change *who owns* a visual
 * property — see `capability/renderOwnership.ts`, unchanged and still
 * authoritative — it only changes how the inputs to those owners are
 * assembled, from "N independent derivations" to "one composition,
 * N consumers."
 */

/**
 * A declarative request for a transient, state-driven visual effect.
 * Kept as data — an id + whether it's currently active — rather than a
 * bare boolean prop, so a second directive (a future state-triggered
 * particle, not to be confused with the *gesture*-triggered petting
 * hearts described below) is "add a variant to this union + a branch in
 * whichever layer realizes it," not "add a new prop threaded through
 * every call site between CombinedCharacterRenderer and whoever draws
 * it."
 *
 * Scope note: this directive list is specifically for particles/effects
 * that are a function of *semantic state* (composed here, from
 * `RenderPlan`). Petting's heart particles (`react/HeartParticles.tsx`)
 * are a *different*, and correctly separate, mechanism — they're
 * positioned at the pointer's stroke coordinates and driven by a
 * continuous drag gesture (`usePetting.ts`), not by which state Mochi is
 * in, so they don't belong in a per-state composition and aren't
 * absorbed into this list. Both are legitimate "particles" extension
 * points; they extend in different directions for a real reason.
 */
export type ParticleDirectiveId = 'fake-celebrate-bounce'

export interface ParticleDirective {
    id: ParticleDirectiveId
    active: boolean
}

/**
 * Which Rive timeline names should be actively mixed in right now.
 * Non-empty only when `path.tier === 'timeline-overlay'` — every other
 * tier owns Animation State a different way (a state-machine input) or
 * not at all (procedural/safe-idle), so there is nothing to list.
 */
export interface OverlayDirective {
    timelines: string[]
}

/**
 * Sprint 6.7A-3 — lightweight, swappable study-room decoration (mug,
 * notebook, book stack, rising steam). Deliberately a *separate*
 * directive list from `ParticleDirective` above, not a reuse of it:
 * these are positioned scene décor, not transient effects layered on
 * Mochi herself, and they're study-room-only (never appear in the home
 * room) — a distinction worth keeping explicit rather than overloading
 * one union with two different meanings.
 *
 * Each id maps to one small, self-contained SVG/CSS component in
 * `renderers/StudyPropsLayer.tsx`. The directive is the whole contract
 * between composition and rendering: swapping a hand-drawn SVG mug for
 * a licensed asset, a Lottie file, or a future Rive prop is a change
 * inside that one component's render branch for `'mug'`, not a change
 * to `composeMotion`, `StudyPropsLayer`'s mount logic, or anything in
 * StudyRoomPage.
 */
/**
 * Sprint 6.7A-4: 'dust' (floating dust motes) and 'lighting' (a slow
 * desk-lamp glow pulse) added — general ambient polish, not tied to one
 * physical object, but still directive-driven for the same reason the
 * physical props are: StudyPropsLayer never decides *when* to show
 * them, only *how* to draw them once `deriveStudyProps` says they're
 * active. "Page flutter" (also on this sprint's brief) is deliberately
 * NOT a separate directive — it's a periodic internal animation of the
 * existing `'notebook'` prop, not a distinct thing that mounts/unmounts
 * on its own.
 */
export type StudyPropId = 'notebook' | 'mug' | 'books' | 'steam' | 'dust' | 'lighting'

export interface StudyPropDirective {
    id: StudyPropId
    active: boolean
}

/**
 * The single object every rendering layer consumes for a given render.
 * Produced once by `composeMotion(state, diagnostics)`.
 */
export interface VisualComposition {
    state: CharacterStateId
    /** Which render tier is live right now, and why (capability-driven; see resolveRenderPath.ts). */
    path: RenderPathDecision
    /** Emotion/eyes/fake-celebrate plan for the procedural layer (StateToClipMap.ts). */
    plan: RenderPlan
    /** Overlay timelines to keep mixed in for the current tier, if any. */
    overlay: OverlayDirective
    /** State-driven particle/effect directives — see ParticleDirective above. */
    particles: ParticleDirective[]
    /** Study-room desk décor directives — see StudyPropDirective above. */
    studyProps: StudyPropDirective[]
    /** Whether idle micro-variety (posture sway) is allowed to run for this state. */
    isIdleLike: boolean
    /** Whether `state` is the active-study-session state (drives posture/breathing nuance). */
    isStudying: boolean
}

/**
 * Extension point for additional Animation State backends (a future
 * Synfig asset, a sprite-sheet renderer, etc.) — see composition/
 * providers.ts for the registry and the concrete steps to add one.
 *
 * A provider is anything that satisfies the existing `CharacterRenderer`
 * contract (renderers/types.ts — unchanged, still just `state` +
 * decorative hints in, JSX out) and additionally declares which
 * `RenderTier`s it's able to realize, so the registry can be inspected
 * (by a future selector, or just by a developer reading it) without
 * opening the component itself.
 */
export interface AnimationProvider {
    id: string
    label: string
    tiers: RenderTier[]
    Component: ComponentType<CharacterRendererProps>
}
