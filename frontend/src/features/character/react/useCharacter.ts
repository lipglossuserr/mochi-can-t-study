import { useSyncExternalStore } from 'react'
import { useCharacterEngine } from './CharacterProvider'
import type { CharacterActions, CharacterSnapshot } from '../types'

/**
 * The one hook screens use to read the character and act on it.
 *
 *   const { state, actions } = useCharacter()
 *   actions.celebrate()
 *
 * Reads are wired through useSyncExternalStore, so components re-render
 * exactly when the engine publishes a new snapshot and never otherwise.
 */
export function useCharacter(): CharacterSnapshot & { actions: CharacterActions } {
    const engine = useCharacterEngine()
    const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot)
    return { ...snapshot, actions: engine.actions }
}