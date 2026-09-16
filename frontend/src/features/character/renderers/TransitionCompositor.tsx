import { useEffect, useRef, useState } from 'react'

/** Cross-fade window this sprint's brief asks for (~200–300ms). Also the
 *  duration the consuming element's `transition: opacity` must use — see
 *  CombinedCharacterRenderer, the sole consumer — so the opacity value
 *  this hook returns actually animates between 0 and 1 instead of
 *  snapping (Sprint 6.7 bugfix: the CSS transition was missing entirely,
 *  so every "cross-fade" was a one-frame flash rather than a fade). */
export const CROSSFADE_MS = 260

/**
 * TransitionCompositor — Sprint 6.6.
 *
 * Covers Idle↔Walk, Idle↔Sleep, Idle↔Study, Idle↔Play, Idle↔Observe —
 * every existing state transition — through one mechanism, so nothing
 * outside this file needs a per-transition custom animation.
 *
 * Rive keeps a single live canvas/runtime instance across every state
 * (re-mounting `<RiveComponent/>` on each transition would reload the
 * whole .riv file and its WASM runtime, which is far more than a scene
 * change warrants). That means a literal two-image dissolve isn't
 * available for the Rive layer the way it is for a DOM overlay that
 * actually mounts/unmounts. Instead, `useRiveCrossfade` dips the canvas
 * to transparent, swaps which clip is playing while it's invisible,
 * and fades back in — the visible result reads as a fade rather than a
 * jump-cut, which is what the brief is actually asking for, even
 * though there's one image underneath rather than two blending.
 *
 * DOM overlay elements that do genuinely mount/unmount (the emotion
 * glow, the eyes-shut overlay in ProceduralLayer) already get a true
 * AnimatePresence dissolve for free — see ProceduralLayer.tsx.
 */
export function useRiveCrossfade(transitionKey: string | null): number {
    const [opacity, setOpacity] = useState(1)
    const previousKey = useRef(transitionKey)

    useEffect(() => {
        if (previousKey.current === transitionKey) return
        previousKey.current = transitionKey

        let cancelled = false
        setOpacity(0)
        const timer = setTimeout(() => {
            if (!cancelled) setOpacity(1)
        }, CROSSFADE_MS / 2)

        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [transitionKey])

    return opacity
}
