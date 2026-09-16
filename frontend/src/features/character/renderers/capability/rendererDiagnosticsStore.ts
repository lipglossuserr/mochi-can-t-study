import type { CharacterStateId } from '../../types'
import type { CapabilitySnapshot } from './RendererCapabilityRegistry'
import type { ValidationIssue } from './validateCapabilities'
import type { RenderPathDecision } from './resolveRenderPath'

/**
 * rendererDiagnosticsStore — Sprint 6.6D-1, extended 6.6D-2.
 *
 * A tiny external store (useSyncExternalStore-compatible) holding what
 * the dev diagnostics overlay needs. RiveCharacterRenderer publishes to
 * it; CombinedCharacterRenderer additionally *reads* `capability` from
 * it (via getDiagnosticsSnapshot) to make its own opacity/cross-fade
 * decision — the only piece of this store any real rendering behavior
 * depends on. Nothing about the character's actual behavior otherwise
 * reads from it, so the display-only fields can be stripped in a
 * production build without touching gameplay.
 */

export interface RendererDiagnosticsSnapshot {
    activeRendererPath: string
    semanticState: CharacterStateId | null
    capability: CapabilitySnapshot | null
    /** 6.6D-2: which tier resolveRenderPath actually chose for the current state, and why. */
    renderPath: RenderPathDecision | null
    activeTimelines: string[]
    activeInput: { name: string; value: boolean | number | 'fired' } | null
    validation: ValidationIssue[]
}

const EMPTY_SNAPSHOT: RendererDiagnosticsSnapshot = {
    activeRendererPath: 'none',
    semanticState: null,
    capability: null,
    renderPath: null,
    activeTimelines: [],
    activeInput: null,
    validation: [],
}

let snapshot: RendererDiagnosticsSnapshot = EMPTY_SNAPSHOT
const listeners = new Set<() => void>()

export function publishDiagnostics(partial: Partial<RendererDiagnosticsSnapshot>): void {
    snapshot = { ...snapshot, ...partial }
    listeners.forEach((listener) => listener())
}

export function subscribeDiagnostics(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

export function getDiagnosticsSnapshot(): RendererDiagnosticsSnapshot {
    return snapshot
}
