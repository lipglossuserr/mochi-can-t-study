import type {
    CharacterStateDefinition,
    CharacterStateId,
} from '../types'

/**
 * The character's state model: one long-lived BASE state (idle,
 * studying, sleeping, ...) plus at most one temporary OVERLAY state
 * (eating, celebrating, being-petted, ...) that automatically expires
 * and reveals the base again.
 *
 * Overlays compete by priority: a new overlay only displaces the
 * current one if its registered priority is >= the current one's.
 * That gives "reaction priorities" (a celebration beats a pet-pat)
 * without any consumer knowing about the mechanism.
 *
 * Extensibility: states are REGISTERED, not hardcoded in a union
 * switch. `registerState('dancing', { priority: 30 })` at runtime is
 * all a future sprint needs — no existing consumer changes.
 */
export class CharacterStateMachine {
    private definitions = new Map<CharacterStateId, CharacterStateDefinition>()
    private base: CharacterStateId = 'idle'
    private overlay: CharacterStateId | null = null
    private overlayTimer: ReturnType<typeof setTimeout> | undefined
    private onChange: () => void

    constructor(onChange: () => void) {
        this.onChange = onChange

        // The known vocabulary, with sensible reaction priorities.
        // Higher = harder to interrupt.
        const defaults: CharacterStateDefinition[] = [
            { id: 'idle', priority: 0 },
            { id: 'sleeping', priority: 0 },
            { id: 'studying', priority: 0 },
            /** Posture-nudge overlay (see CharacterEvent's 'posture-nudge-suggested' doc comment) — deliberately low priority so it never interrupts a genuine reaction (feeding, celebrating, being petted); it only shows when nothing more important is already happening. */
            { id: 'stretching', priority: 1 },
            { id: 'following-cursor', priority: 5 },
            { id: 'happy', priority: 10 },
            { id: 'being-petted', priority: 10 },
            /** Double-tap reaction (see CharacterEvent's 'user-double-tapped' doc comment) — same tier as being-petted/happy: a genuine light reaction, just briefer. */
            { id: 'curiosity-pause', priority: 10 },
            { id: 'eating', priority: 20 },
            { id: 'playing', priority: 20 },
            { id: 'celebrating', priority: 30 },
        ]
        defaults.forEach((definition) => this.definitions.set(definition.id, definition))
    }

    /** Add (or redefine) a state at runtime. */
    registerState(definition: CharacterStateDefinition): void {
        this.definitions.set(definition.id, definition)
    }

    get baseState(): CharacterStateId {
        return this.base
    }

    get overlayState(): CharacterStateId | null {
        return this.overlay
    }

    /** What a renderer should show right now. */
    get displayState(): CharacterStateId {
        return this.overlay ?? this.base
    }

    /**
     * Replace the long-lived state. Does not touch a running overlay —
     * when the overlay expires, the new base is what's revealed.
     */
    setBase(state: CharacterStateId): void {
        if (this.base === state) return
        this.base = state
        if (!this.overlay) this.onChange()
    }

    /**
     * Show `state` temporarily for `durationMs`, if it out-prioritises
     * whatever overlay is already showing. Returns true if it won.
     */
    pushOverlay(state: CharacterStateId, durationMs: number): boolean {
        const incoming = this.priorityOf(state)
        if (this.overlay !== null && incoming < this.priorityOf(this.overlay)) {
            return false // current reaction outranks this one; ignore
        }

        clearTimeout(this.overlayTimer)
        this.overlay = state
        this.overlayTimer = setTimeout(() => {
            this.overlay = null
            this.onChange()
        }, durationMs)
        this.onChange()
        return true
    }

    clearOverlay(): void {
        clearTimeout(this.overlayTimer)
        if (this.overlay !== null) {
            this.overlay = null
            this.onChange()
        }
    }

    dispose(): void {
        clearTimeout(this.overlayTimer)
    }

    private priorityOf(state: CharacterStateId): number {
        return this.definitions.get(state)?.priority ?? 0
    }
}