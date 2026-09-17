import type { ComponentType } from 'react'
import type { AfterglowState, CharacterStateId, RoomPresenceSnapshot, RoutineFamiliaritySnapshot } from '../types'

/**
 * The contract every renderer implements: given a semantic state,
 * draw the character. Renderers are the ONLY layer allowed to know
 * about a rendering technology (Rive today, sprite sheets or Lottie
 * or Three.js tomorrow). Swapping technology = writing one component
 * that satisfies this type and registering it in
 * `composition/providers.ts` (6.7A) — CombinedCharacterRenderer,
 * ProceduralLayer, and composeMotion never import a provider by name.
 *
 * Extension point — adding a new decorative hint: every field below
 * `state`/`ariaLabel` follows the same optional, purely-decorative
 * pattern (`afterglow`, `presence`, `routineFamiliarity`) — a new hint
 * is always `fieldName?: SomeSnapshot | null`, documented as optional
 * and behavior-inert for a renderer that ignores it, exactly like the
 * three already here. That keeps every current and future renderer
 * implementation able to opt in to only the hints it actually draws,
 * without a required field ever forcing every renderer (including a
 * future minimal one) to handle data it doesn't use.
 */
export interface CharacterRendererProps {
    state: CharacterStateId
    /** Accessible description; renderers put it on their root element. */
    ariaLabel?: string
    /**
     * Sprint 5.3B: the current dominant behavioral-memory afterglow, if
     * any. Optional and purely a rendering hint — a renderer that
     * doesn't care (Rive, today) can ignore it entirely; nothing about
     * the character's actual behavior depends on a renderer reading it.
     */
    afterglow?: AfterglowState | null
    /**
     * Sprint 5.4: the current room-presence/comfort signal, if any.
     * Same contract as `afterglow` — optional, purely a rendering hint.
     * A renderer that ignores it (Rive, today) pays nothing extra; the
     * character's actual behavior never depends on a renderer reading it.
     */
    presence?: RoomPresenceSnapshot | null
    /**
     * Sprint 6.0: the current routine-familiarity signal, if any. Same
     * optional/decorative contract as `afterglow`/`presence` — a
     * renderer that ignores it pays nothing extra.
     */
    routineFamiliarity?: RoutineFamiliaritySnapshot | null
    /**
     * Shop v1.1: the pet's currently-equipped skin itemKey (e.g.
     * "skin-calico"), if any. Same optional/decorative contract as the
     * three hints above — a renderer that ignores it (there is none
     * today; RiveCharacterRenderer maps it to one of mochi.riv's
     * 'orange'/'calico'/'white' one-shot timelines) pays nothing extra,
     * and nothing about the character's actual behavior depends on a
     * renderer reading it. Undefined/unrecognized falls back to the
     * asset's own default look.
     */
    skin?: string | null
}

export type CharacterRenderer = ComponentType<CharacterRendererProps>