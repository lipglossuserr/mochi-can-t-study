import { useRive } from '@rive-app/react-canvas'

/** Mirrors the pattern already used in RiveCharacterRenderer.tsx's
 * overlayPlay/overlayRelease — derived rather than assumed, since the
 * exact named export for this type has moved across package versions. */
type RiveInstance = NonNullable<ReturnType<typeof useRive>['rive']>

/**
 * RendererCapabilityRegistry — Sprint 6.6D-1.
 *
 * Inspects a *loaded* Rive instance and reports what it actually
 * contains — inputs, timelines, and (if present) Data Binding ViewModel
 * properties — instead of trusting the hand-written name lists in
 * RiveCharacterRenderer.tsx. Those lists were written against what the
 * asset was believed to expose; this module is the runtime check that
 * confirms (or refutes) that belief.
 *
 * Pure inspection: nothing here fires an input or plays a timeline. It
 * only reads what the asset says it has.
 */

export type CapabilityInputType = 'boolean' | 'number' | 'trigger' | 'unknown'

export interface CapabilityInput {
    name: string
    type: CapabilityInputType
}

export interface ViewModelCapability {
    /**
     * Whether this Rive runtime/asset exposes the Data Binding ViewModel
     * API at all. Confirmed `true` for mochi.riv as of Sprint 6.6D-3:
     * focusLvl1/2/3, focusEnd, food_fish/Food_Spawn_Fish, and isPressed
     * all turned out to be bound ViewModel properties rather than
     * classic State Machine Inputs (the two are different Rive
     * capabilities that happen to serve the same renderer-side purpose).
     */
    detected: boolean
    properties: string[]
    /**
     * The live ViewModel instance itself, kept (not just its property
     * names) so callers can actually read/write bound properties — see
     * ViewModelBridge in RiveCharacterRenderer.tsx. Untyped because the
     * accessor API's exact shape has moved across
     * @rive-app/react-canvas versions; every consumer must probe it
     * defensively the same way inspectViewModel() does below.
     */
    instance?: unknown
    /** Set when the API exists but inspection itself failed, for visibility. */
    inspectionError?: string
}

export interface CapabilitySnapshot {
    assetSrc: string
    stateMachineName: string
    inputs: CapabilityInput[]
    timelines: string[]
    viewModel: ViewModelCapability
}

function classifyInputType(input: { value?: unknown; fire?: unknown }): CapabilityInputType {
    if (typeof input.value === 'boolean') return 'boolean'
    if (typeof input.value === 'number') return 'number'
    if (typeof input.fire === 'function') return 'trigger'
    return 'unknown'
}

/**
 * Best-effort Data Binding / ViewModel inspection. Method names for this
 * API have moved between @rive-app/react-canvas versions, and this asset
 * has never been confirmed to use it at all (everything found by manual
 * inspection so far is classic State Machine inputs + timelines) — so
 * every call here is individually guarded, and "not detected" is treated
 * as a normal, expected outcome rather than a failure.
 */
function inspectViewModel(rive: RiveInstance): ViewModelCapability {
    const candidateAccessors: Array<() => unknown> = [
        () => (rive as unknown as { defaultViewModel?: () => unknown }).defaultViewModel?.(),
        () => (rive as unknown as { viewModelInstance?: unknown }).viewModelInstance,
    ]

    for (const getInstance of candidateAccessors) {
        try {
            const instance = getInstance()
            if (!instance) continue

            const props =
                (instance as { properties?: Array<{ name: string }> }).properties ??
                (instance as { getProperties?: () => Array<{ name: string }> }).getProperties?.()

            if (Array.isArray(props)) {
                return {
                    detected: true,
                    properties: props.map((p) => p.name).filter(Boolean),
                    instance,
                }
            }
        } catch (error) {
            return {
                detected: false,
                properties: [],
                inspectionError: error instanceof Error ? error.message : String(error),
            }
        }
    }

    return { detected: false, properties: [] }
}

export function inspectRiveCapabilities(
    rive: RiveInstance,
    stateMachineName: string,
    assetSrc: string,
): CapabilitySnapshot {
    let inputs: CapabilityInput[] = []
    try {
        const machineInputs = rive.stateMachineInputs(stateMachineName) ?? []
        inputs = machineInputs.map((input) => ({
            name: input.name,
            type: classifyInputType(input as unknown as { value?: unknown; fire?: unknown }),
        }))
    } catch {
        inputs = []
    }

    let timelines: string[] = []
    try {
        timelines = (
            rive.contents?.artboards?.flatMap((artboard) => artboard.animations ?? []) ?? []
        ) as string[]
    } catch {
        timelines = []
    }

    return {
        assetSrc,
        stateMachineName,
        inputs,
        timelines,
        viewModel: inspectViewModel(rive),
    }
}
