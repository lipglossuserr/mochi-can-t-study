import type { CapabilitySnapshot } from './RendererCapabilityRegistry'
import { REFERENCED_INPUTS, REFERENCED_TIMELINES, ALL_SEMANTIC_STATES } from './rendererContract'
import { resolveRenderPath } from './resolveRenderPath'

/**
 * validateCapabilities — Sprint 6.6D-1, revised 6.6D-2.
 *
 * Cross-checks the runtime-inspected asset (RendererCapabilityRegistry)
 * against every input/timeline name RiveCharacterRenderer.tsx assumes
 * exists, and — as of 6.6D-2 — confirms every semantic state resolves
 * to a real render path via resolveRenderPath(), the same function the
 * renderers themselves call. (6.6D-1's version checked only whether a
 * state had a *hand-written* mapping anywhere; that couldn't tell "the
 * mapping exists but the registry doesn't actually back it" apart from
 * "properly covered." This version can, because it asks the same
 * function the running app asks.)
 *
 * Startup validation, not enforcement: nothing here blocks rendering —
 * resolveRenderPath's own tiered fallback (state-machine → timeline →
 * procedural → safe-idle) is what actually keeps the app safe. This
 * module's job is only to make gaps *visible* instead of silent.
 */

export interface ValidationIssue {
    severity: 'error' | 'warning'
    category: 'input' | 'timeline' | 'state-coverage' | 'view-model'
    message: string
}

function inputExists(registry: CapabilitySnapshot, name: string): boolean {
    const lower = name.toLowerCase()
    // Classic State Machine Input, OR a Data Binding ViewModel property of
    // the same name — mochi.riv turned out to expose focusLvl1/2/3,
    // focusEnd, food_fish/Food_Spawn_Fish, and isPressed as the latter
    // (see RendererCapabilityRegistry.ts), and ViewModelBridge in
    // RiveCharacterRenderer.tsx can drive either one, so either one
    // counts as "this capability is really there."
    return (
        registry.inputs.some((input) => input.name.toLowerCase() === lower) ||
        registry.viewModel.properties.some((prop) => prop.toLowerCase() === lower)
    )
}

function timelineExists(registry: CapabilitySnapshot, name: string): boolean {
    return registry.timelines.some((timeline) => timeline.toLowerCase() === name.toLowerCase())
}

export function validateRendererCapabilities(registry: CapabilitySnapshot): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    for (const { primary, fallback } of REFERENCED_INPUTS) {
        const primaryFound = inputExists(registry, primary)
        const fallbackFound = fallback ? inputExists(registry, fallback) : false
        if (!primaryFound && !fallbackFound) {
            issues.push({
                severity: 'warning',
                category: 'input',
                message: fallback
                    ? `Neither input "${primary}" nor fallback "${fallback}" found on state machine "${registry.stateMachineName}". Any state that needs this input will automatically fall back to a lower render tier.`
                    : `Input "${primary}" not found on state machine "${registry.stateMachineName}". Any state that needs this input will automatically fall back to a lower render tier.`,
            })
        }
    }

    for (const timeline of REFERENCED_TIMELINES) {
        if (!timelineExists(registry, timeline)) {
            issues.push({
                severity: 'warning',
                category: 'timeline',
                message: `Timeline "${timeline}" not found among the asset's reported animations. Any state that needs this timeline will automatically fall back to a lower render tier.`,
            })
        }
    }

    if (registry.viewModel.inspectionError) {
        issues.push({
            severity: 'warning',
            category: 'view-model',
            message: `ViewModel/Data Binding inspection threw: ${registry.viewModel.inspectionError}`,
        })
    }

    for (const state of ALL_SEMANTIC_STATES) {
        const decision = resolveRenderPath(state, registry)
        if (decision.tier === 'safe-idle') {
            issues.push({
                severity: 'error',
                category: 'state-coverage',
                message: `Semantic state "${state}" resolves to safe-idle — no state-machine, timeline, or procedural capability available. ${decision.reason}`,
            })
        }
    }

    return issues
}

