import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { EnvironmentEngine } from '../EnvironmentEngine'

const EnvironmentEngineContext = createContext<EnvironmentEngine | null>(null)

/**
 * Owns exactly one EnvironmentEngine for the app's lifetime. Mount
 * once near the root — order relative to `CharacterProvider` doesn't
 * matter, since neither engine imports or waits on the other; they
 * only ever meet inside a small React bridge (see
 * `useMochiEnvironmentBridge`) that reads one and writes the other.
 */
export function EnvironmentProvider({ children }: { children: ReactNode }) {
    const engineRef = useRef<EnvironmentEngine | null>(null)
    if (engineRef.current === null) {
        engineRef.current = new EnvironmentEngine()
    }

    useEffect(() => {
        const engine = engineRef.current
        return () => {
            engine?.dispose()
            engineRef.current = null
        }
    }, [])

    return (
        <EnvironmentEngineContext.Provider value={engineRef.current}>
            {children}
        </EnvironmentEngineContext.Provider>
    )
}

export function useEnvironmentEngine(): EnvironmentEngine {
    const engine = useContext(EnvironmentEngineContext)
    if (!engine) {
        throw new Error('useEnvironmentEngine must be used within an EnvironmentProvider')
    }
    return engine
}
