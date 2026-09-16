import { useEffect, useRef, useState } from 'react'
import {
    Alignment,
    Fit,
    Layout,
    useRive,
    type StateMachineInput,
} from '@rive-app/react-canvas'
import type { PetState } from '@/features/pet/types/pet'
import LivingMochiRenderer from './LivingMochiRenderer'
import type { CharacterStateId } from '../types'
import type { CharacterRendererProps } from './types'
import { inspectRiveCapabilities, type CapabilitySnapshot } from './capability/RendererCapabilityRegistry'
import { validateRendererCapabilities } from './capability/validateCapabilities'
import { publishDiagnostics } from './capability/rendererDiagnosticsStore'
import { STATE_OVERLAYS } from './capability/rendererContract'
import { resolveRenderPath, type RenderTier } from './capability/resolveRenderPath'
import { RiveOverlayController } from './RiveOverlayController'

/**
 * Rive renderer for mochi.riv.
 *
 * Sole owner of Animation State (see capability/renderOwnership.ts), and
 * this codebase's one registered Animation-State provider (see
 * composition/providers.ts) — CombinedCharacterRenderer mounts it via
 * `selectAnimationProvider()` rather than importing it by name, so a
 * future second provider is a registry entry, not a call-site edit.
 * This file's life (idle blending, blink, tail, the fish-eating logic,
 * focus transitions) is orchestrated by its own "State Machine 1" and
 * internal scripts — bypassing the machine and playing raw timelines
 * orphans those flows, so the machine runs and stays authoritative
 * whenever it can.
 *
 * 6.6D-2: which of {state-machine tier, timeline-overlay tier, procedural
 * tier, safe-idle} actually happens for a given state is decided by
 * resolveRenderPath() against the live Capability Registry built at load
 * — never assumed. If the machine's real inputs (focusLvl1/2/3, focusEnd,
 * food_fish, isPressed) are confirmed present, they're used; if not, but
 * the machine-independent overlay timelines ('leftandright', 'upanddown',
 * 'Idle 2', 'orange') are confirmed present, those are mixed in instead
 * (play/release lifecycle owned by RiveOverlayController — see that
 * file for the black-flash fix and its Sprint 6.7A hardening); if
 * neither, ProceduralLayer's always-on overlay carries the state on its
 * own with no Rive involvement at all — every one of those is a
 * deliberate, logged decision, not a silent no-op. If the .riv asset
 * fails to load outright, the hand-drawn LivingMochiRenderer takes over.
 *
 * `composeMotion()` (composition/composeMotion.ts) reuses this file's
 * published tier decision for everything *downstream* of Rive itself
 * (ProceduralLayer's props, the cross-fade key) rather than
 * re-deciding it — this file remains the one place with a synchronous,
 * un-stale read of the Capability Registry, so it stays the source of
 * truth for the decision; composeMotion only avoids recomputing it.
 */

const RIVE_SRC = '/mochi.riv'
const STATE_MACHINE_NAME = 'State Machine 1'

/** Study-session focus escalation (ms into 'studying'). */
const FOCUS_LEVEL_2_AFTER_MS = 3 * 60 * 1000
const FOCUS_LEVEL_3_AFTER_MS = 8 * 60 * 1000

/** Legacy 4-state view, still used by PetContext for captions. */
const ENGINE_TO_LEGACY: Record<string, PetState> = {
    studying: 'STUDYING',
    celebrating: 'CELEBRATING',
    happy: 'HAPPY',
    eating: 'HAPPY',
    playing: 'HAPPY',
    'being-petted': 'HAPPY',
}

export function toLegacyPetState(state: CharacterStateId): PetState {
    return ENGINE_TO_LEGACY[state] ?? 'IDLE'
}

/** Case-insensitive registry of the machine's inputs, built at load. */
class RiveInputs {
    private byName = new Map<string, StateMachineInput>()
    /** Sprint 6.6D-1: last successful set()/fire(), for dev diagnostics only. */
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
 * Sprint 6.6D-3: bridge onto the asset's Data Binding ViewModel
 * instance. Manual inspection had assumed mochi.riv used a classic
 * State Machine only — 6.6D-2's validator proved that wrong:
 * focusLvl1/2/3, focusEnd, food_fish (Food_Spawn_Fish), and isPressed
 * are all bound ViewModel properties instead, which RiveInputs (built
 * from stateMachineInputs() alone) can never see or drive. This bridge
 * writes to those bound properties directly, with the same defensive
 * multi-shape probing inspectViewModel() uses in
 * capability/RendererCapabilityRegistry.ts, since the property-accessor
 * API's exact method names have moved across @rive-app/react-canvas
 * versions and aren't worth hard-coding a single shape for.
 */
class ViewModelBridge {
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

        // Shape B: instance.properties / instance.getProperties(), searched by name —
        // same list inspectViewModel() reads to report property names.
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

function RiveCharacterRenderer({ state, ariaLabel }: CharacterRendererProps) {
    const [loadFailed, setLoadFailed] = useState(false)
    const inputsRef = useRef<RiveInputs | null>(null)
    /** Sprint 6.6D-3: fallback for inputs the machine exposes as bound ViewModel properties instead. */
    const viewModelRef = useRef<ViewModelBridge | null>(null)
    const timelinesRef = useRef<Set<string>>(new Set())
    const capabilityRef = useRef<CapabilitySnapshot | null>(null)
    const previousStateRef = useRef<CharacterStateId | null>(null)
    /** Which tier actually ran for the current state, so exit logic undoes the right thing. */
    const activeTierRef = useRef<RenderTier | null>(null)
    const focusTimersRef = useRef<number[]>([])
    /** Sprint 6.7A: extracted, race-safe overlay play/release — one instance per mount. */
    const overlaysRef = useRef(new RiveOverlayController())

    useEffect(() => {
        const overlays = overlaysRef.current
        return () => overlays.dispose()
    }, [])

    const { rive, RiveComponent } = useRive({
        src: RIVE_SRC,
        stateMachines: STATE_MACHINE_NAME, // the machine stays in charge
        autoplay: true,
        layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
        onLoadError: () => setLoadFailed(true),
    })

    // ---- load: enumerate inputs + timelines, apply the orange skin ----
    useEffect(() => {
        if (!rive) return

        let machineInputs: StateMachineInput[] = []
        try {
            machineInputs = rive.stateMachineInputs(STATE_MACHINE_NAME) ?? []
        } catch {
            machineInputs = []
        }
        inputsRef.current = new RiveInputs(machineInputs)

        const animations =
            rive.contents?.artboards?.flatMap((artboard) => artboard.animations ?? []) ?? []
        timelinesRef.current = new Set(animations as string[])

        console.info(
            '[Mochi/Rive] loaded %s\n  machine "%s" inputs: %s\n  timelines: %s',
            RIVE_SRC,
            STATE_MACHINE_NAME,
            machineInputs.map((input) => input.name).join(', ') || '(none)',
            (animations as string[]).join(', ') || '(none reported)',
        )

        // Sprint 6.6D-1: build the capability registry from what the asset
        // actually reports, validate every input/timeline name this file
        // depends on, and confirm every semantic state resolves to some
        // renderer capability. Inspection/validation only — nothing here
        // fires an input or plays a timeline.
        const capability = inspectRiveCapabilities(rive, STATE_MACHINE_NAME, RIVE_SRC)
        capabilityRef.current = capability
        viewModelRef.current = capability.viewModel.detected
            ? new ViewModelBridge(capability.viewModel.instance)
            : null
        const validation = validateRendererCapabilities(capability)

        if (validation.length === 0) {
            console.info('[Mochi/Rive] capability validation: all clear.')
        } else {
            for (const issue of validation) {
                const log = issue.severity === 'error' ? console.error : console.warn
                log(`[Mochi/Rive] capability validation (${issue.category}): ${issue.message}`)
            }
        }

        publishDiagnostics({
            activeRendererPath: 'RiveCharacterRenderer (state-machine-driven) + ProceduralLayer',
            capability,
            validation,
        })

        // Orange variant: a one-shot skin timeline mixed over the machine.
        overlaysRef.current.play(rive, timelinesRef.current, ['orange'])
    }, [rive])

    // ---- engine state → capability-driven render path ----
    useEffect(() => {
        const inputs = inputsRef.current
        if (!rive || !inputs) return

        // Sprint 6.6D-3: try the classic Input first; if the asset doesn't
        // have one by that name, fall through to the Data Binding
        // ViewModel bridge before giving up — see ViewModelBridge above.
        // Tracked here (not just on `inputs`) so a ViewModel-driven change
        // still shows up as `lastActive` for diagnostics.
        const setInput = (name: string, value: boolean | number): boolean => {
            const ok = inputs.set(name, value) || (viewModelRef.current?.set(name, value) ?? false)
            if (ok) inputs.lastActive = { name, value }
            return ok
        }
        const fireInput = (name: string): boolean => {
            const ok = inputs.fire(name) || (viewModelRef.current?.fire(name) ?? false)
            if (ok) inputs.lastActive = { name, value: 'fired' }
            return ok
        }

        const previous = previousStateRef.current
        previousStateRef.current = state
        if (previous === state) return

        const previousTier = activeTierRef.current

        // ---- exit actions: undo whatever tier was actually active, not
        // whatever tier the code *would* use for `previous` in general ----
        focusTimersRef.current.forEach((timer) => window.clearTimeout(timer))
        focusTimersRef.current = []

        if (previousTier === 'state-machine') {
            if (previous === 'studying') {
                fireInput('focusEnd') // the machine plays its own Break flow
                setInput('focusLvl1', false)
                setInput('focusLvl2', false)
                setInput('focusLvl3', false)
            }
            if (previous === 'being-petted') {
                setInput('isPressed', false)
            }
        }
        if (previousTier === 'timeline-overlay' && previous && STATE_OVERLAYS[previous]) {
            overlaysRef.current.release(rive, timelinesRef.current, STATE_OVERLAYS[previous])
        }

        // ---- resolve, then act on exactly one tier ----
        const decision = resolveRenderPath(state, capabilityRef.current)
        activeTierRef.current = decision.tier

        switch (decision.tier) {
            case 'state-machine':
                switch (state) {
                    case 'studying':
                        if (!setInput('focusLvl1', true)) fireInput('focusLvl1')
                        // Deepen concentration as the session runs long. These
                        // escalation/exit inputs (focusLvl2/3, focusEnd) are a
                        // refinement on top of the entry decision above, not a
                        // second capability check — if the asset lost `focusLvl1`
                        // between load and now, resolveRenderPath already routed
                        // us to a different tier entirely and this branch never runs.
                        focusTimersRef.current.push(
                            window.setTimeout(() => {
                                setInput('focusLvl1', false)
                                if (!setInput('focusLvl2', true)) fireInput('focusLvl2')
                            }, FOCUS_LEVEL_2_AFTER_MS),
                            window.setTimeout(() => {
                                setInput('focusLvl2', false)
                                if (!setInput('focusLvl3', true)) fireInput('focusLvl3')
                            }, FOCUS_LEVEL_3_AFTER_MS),
                        )
                        break

                    case 'eating':
                        // The machine owns the whole spawn→eat→clear flow.
                        if (!fireInput('food_fish')) fireInput('Food_Spawn_Fish')
                        break

                    case 'being-petted':
                        if (!setInput('isPressed', true)) fireInput('Trigger 1')
                        break
                }
                break

            case 'timeline-overlay':
                overlaysRef.current.play(rive, timelinesRef.current, STATE_OVERLAYS[state] ?? [])
                break

            case 'procedural':
                // Deliberate no-op on the Rive canvas: ProceduralLayer (always
                // mounted alongside this renderer) carries the whole visual
                // signal for this state on its own. Nothing to do here.
                break

            case 'safe-idle':
                // Only reachable for a state with no capability at any tier —
                // every one of the 22 states this engine currently emits has
                // at least a procedural StateToClipMap entry, so this is a
                // last-resort net for an unrecognized future state string,
                // not a path any known state takes today.
                overlaysRef.current.release(rive, timelinesRef.current, Object.values(STATE_OVERLAYS).flat())
                console.error(`[Mochi/Rive] ${decision.reason}`)
                break
        }

        // Diagnostics-only publish, after the real transition logic above
        // has already run. Reads state/tier, does not drive either.
        publishDiagnostics({
            semanticState: state,
            renderPath: decision,
            activeTimelines:
                decision.tier === 'timeline-overlay'
                    ? (STATE_OVERLAYS[state] ?? []).filter((name) => timelinesRef.current.has(name))
                    : [],
            activeInput: inputs.lastActive,
        })
    }, [rive, state])

    if (loadFailed) {
        return <LivingMochiRenderer state={state} ariaLabel={ariaLabel} />
    }

    return (
        <div className="h-full w-full" role="img" aria-label={ariaLabel}>
            <RiveComponent />
        </div>
    )
}

export default RiveCharacterRenderer
