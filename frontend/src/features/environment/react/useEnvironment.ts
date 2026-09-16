import { useSyncExternalStore } from 'react'
import { useEnvironmentEngine } from './EnvironmentProvider'
import type { EnvironmentActions, EnvironmentSnapshot } from '../types'

/**
 * The one hook renderers use to read the environment's semantic data.
 * Same `useSyncExternalStore` contract as `useCharacter` — components
 * re-render exactly when the engine publishes a new snapshot (at most
 * once a minute, or on a Mochi-activity change) and never otherwise.
 */
export function useEnvironment(): EnvironmentSnapshot & { actions: EnvironmentActions } {
    const engine = useEnvironmentEngine()
    const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot)
    return { ...snapshot, actions: engine.actions }
}
