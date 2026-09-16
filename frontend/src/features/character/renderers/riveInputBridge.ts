import type { StateMachineInput, useRive } from '@rive-app/react-canvas'

type RiveInstance = NonNullable<ReturnType<typeof useRive>['rive']>

/**
 * Best-effort lookup of the asset's Data Binding ViewModel instance
 * (`ViewModel1` on mochi.riv). Same two candidate accessors
 * `RendererCapabilityRegistry.ts`'s `inspectViewModel()` tries, kept
 * here too so callers that only need the raw instance (to hand to
 * `ViewModelBridge` below) don't have to pull in the full capability
 * inspection/validation machinery just for that.
 */
export function getViewModelInstance(rive: RiveInstance): unknown {
    const candidateAccessors: Array<() => unknown> = [
        () => (rive as unknown as { defaultViewModel?: () => unknown }).defaultViewModel?.(),
        () => (rive as unknown as { viewModelInstance?: unknown }).viewModelInstance,
    ]
    for (const getInstance of candidateAccessors) {
        try {
            const instance = getInstance()
            if (instance) return instance
        } catch {
            /* try the next candidate shape */
        }
    }
    return null
}

/**
 * riveInputBridge — extracted from RiveCharacterRenderer.tsx.
 *
 * `RiveInputs` (classic State Machine inputs) and `ViewModelBridge` (Data
 * Binding ViewModel properties — see mochi.riv's `ViewModel1`) used to be
 * private classes duplicated by hand between RiveCharacterRenderer and
 * a second, simpler Rive component (`RivePet`, since removed once its
 * one remaining consumer — a dashboard card superseded by
 * `MeetMochiCard` on /profile — turned out to be dead code). RivePet's
 * copy had drifted to a *hypothetical future* asset contract (a
 * `PetStateMachine` state machine with a numeric `state` input) that
 * mochi.riv never actually had — the real, only state machine on the
 * asset is `State Machine 1`, driven mostly through `ViewModel1`'s
 * bound properties (`focusLvl1/2/3`, `focusEnd`, `isPressed`,
 * `food_fish` / `Food_Spawn_Fish`, `Trigger 1`). Because
 * `useStateMachineInput` silently returns `undefined` for a name that
 * doesn't exist rather than throwing, RivePet never actually drove the
 * asset — it just sat on `State Machine 1`'s own default look
 * regardless of the `state` prop passed in.
 *
 * This bridge stays extracted (rather than folded back into
 * RiveCharacterRenderer now that it's the only consumer) specifically
 * so a second Rive consumer never again gets a chance to duplicate —
 * and silently drift from — this logic the way RivePet did: there is
 * exactly one implementation of "how do I set/fire a name on this
 * asset," verified against the real mochi.riv's inputs
 * (RiveCharacterRenderer's own console diagnostics on load are the
 * source of truth — see that file's header comment).
 */

/** Case-insensitive registry of a state machine's classic inputs. */
export class RiveInputs {
    private byName = new Map<string, StateMachineInput>()
    /** Last successful set()/fire(), for dev diagnostics only. */
    lastActive: { name: string; value: boolean | number | 'fired' } | null = null

    constructor(inputs: StateMachineInput[]) {
        inputs.forEach((input) => this.byName.set(input.name.trim().toLowerCase(), input))
    }

    fire(name: string): boolean {
        const input = this.byName.get(name.toLowerCase())
        if (!input) return false
        try {
            input.fire()
            this.lastActive = { name, value: 'fired' }
            return true
        } catch {
            return false
        }
    }

    set(name: string, value: boolean | number): boolean {
        const input = this.byName.get(name.toLowerCase())
        if (!input) return false
        try {
            input.value = value
            this.lastActive = { name, value }
            return true
        } catch {
            return false
        }
    }
}

/**
 * Bridge onto the asset's Data Binding ViewModel instance (`ViewModel1`
 * on mochi.riv). Manual inspection had assumed mochi.riv used a classic
 * State Machine only — it doesn't: focusLvl1/2/3, focusEnd, food_fish
 * (Food_Spawn_Fish), isPressed, and Trigger 1 are all bound ViewModel
 * properties instead, which `RiveInputs` (built from
 * `stateMachineInputs()` alone) can never see or drive. This bridge
 * writes to those bound properties directly, with defensive multi-shape
 * probing since the property-accessor API's exact method names have
 * moved across `@rive-app/react-canvas` versions and aren't worth
 * hard-coding a single shape for.
 */
export class ViewModelBridge {
    private readonly instance: unknown

    constructor(instance: unknown) {
        this.instance = instance
    }

    private resolveProperty(name: string, accessor: 'boolean' | 'number' | 'trigger'): unknown {
        if (!this.instance) return null

        // Shape A: instance.boolean(name) / instance.number(name) / instance.trigger(name)
        const typedAccessor = (this.instance as Record<string, unknown>)[accessor]
        if (typeof typedAccessor === 'function') {
            try {
                const prop = (typedAccessor as (n: string) => unknown).call(this.instance, name)
                if (prop) return prop
            } catch {
                /* fall through to a generic property lookup */
            }
        }

        // Shape B: instance.properties / instance.getProperties(), searched by name.
        try {
            const list =
                (this.instance as { properties?: Array<{ name: string }> }).properties ??
                (this.instance as { getProperties?: () => Array<{ name: string }> }).getProperties?.()
            if (Array.isArray(list)) {
                const match = list.find((prop) => prop.name?.toLowerCase() === name.toLowerCase())
                if (match) return match
            }
        } catch {
            /* no generic list available on this instance shape either */
        }

        return null
    }

    set(name: string, value: boolean | number): boolean {
        const kind = typeof value === 'boolean' ? 'boolean' : 'number'
        const prop = this.resolveProperty(name, kind)
        if (!prop) return false
        try {
            ;(prop as { value: boolean | number }).value = value
            return true
        } catch {
            return false
        }
    }

    fire(name: string): boolean {
        const prop = this.resolveProperty(name, 'trigger')
        if (!prop) return false
        try {
            const triggerable = prop as { trigger?: () => void; fire?: () => void }
            if (typeof triggerable.trigger === 'function') {
                triggerable.trigger()
                return true
            }
            if (typeof triggerable.fire === 'function') {
                triggerable.fire()
                return true
            }
        } catch {
            return false
        }
        return false
    }
}
