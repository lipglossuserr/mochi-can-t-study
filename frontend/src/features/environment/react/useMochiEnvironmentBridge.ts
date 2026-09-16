import { useEffect } from 'react'
import { useCharacter, type CharacterStateId } from '@/features/character'
import { useEnvironment } from './useEnvironment'
import type { MochiActivityLevel } from '../types'

/**
 * The single, deliberate seam between the two systems.
 *
 * Direction matters here: this hook imports from the CHARACTER
 * feature's public API and writes into the environment. Nothing in
 * `features/character` imports from or knows about
 * `features/environment` — the character engine, its behavior
 * modules, and its renderers are completely unmodified by this
 * sprint. The environment "reacts subtly to existing character
 * state" (the brief's own words) by having ITS OWN react layer read
 * the character's already-public `state`, never by the character
 * pushing anything into the room.
 *
 * The mapping below is intentionally coarse — three bands, not a
 * switch statement per state — because the brief asks for exactly two
 * data points ("sleeping → calmer," "energetic → livelier") and
 * nothing else. Every other state reads as the room's own neutral
 * baseline, which is itself already time-of-day aware.
 */
const LIVELY_STATES = new Set<CharacterStateId>([
    'playing',
    'anticipating-playing',
    'content-playing',
    'celebrating',
    'anticipating-celebrating',
    'content-celebrating',
    'being-petted',
    'content-petted',
    'happy',
])

function activityFor(state: CharacterStateId): MochiActivityLevel {
    if (state === 'sleeping') return 'calm'
    if (LIVELY_STATES.has(state)) return 'lively'
    return 'neutral'
}

/**
 * Call this once from wherever the room composes character +
 * environment together (see `AmbientLayer`). It has no visual output
 * of its own — it only keeps `EnvironmentEngine.actions.setMochiActivity`
 * in sync with the character's current state.
 */
export function useMochiEnvironmentBridge(): void {
    const { state } = useCharacter()
    const { actions } = useEnvironment()

    useEffect(() => {
        actions.setMochiActivity(activityFor(state))
    }, [state, actions])
}
