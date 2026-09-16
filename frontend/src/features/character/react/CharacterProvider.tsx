import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { CharacterEngine } from '../engine/CharacterEngine'

const CharacterEngineContext = createContext<CharacterEngine | null>(null)

/**
 * Owns exactly one CharacterEngine for the app's lifetime and makes
 * it available to hooks. Mount once, near the root (outside anything
 * that wants to talk to the character).
 */
export function CharacterProvider({ children }: { children: ReactNode }) {
    const engineRef = useRef<CharacterEngine | null>(null)
    if (engineRef.current === null) {
        engineRef.current = new CharacterEngine()
    }

    useEffect(() => {
        const engine = engineRef.current
        return () => {
            engine?.dispose()
            engineRef.current = null
        }
    }, [])

    return (
        <CharacterEngineContext.Provider value={engineRef.current}>
            {children}
        </CharacterEngineContext.Provider>
    )
}

export function useCharacterEngine(): CharacterEngine {
    const engine = useContext(CharacterEngineContext)
    if (!engine) {
        throw new Error('useCharacterEngine must be used within a CharacterProvider')
    }
    return engine
}