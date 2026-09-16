import { useCallback, useEffect, useRef } from 'react'
import { useCharacterEngine } from './CharacterProvider'
import { prefersReducedMotion } from '../utils/reducedMotion'

/**
 * useCursorAwareness — feeds the engine's gaze channel from pointer
 * movement over a container (typically the whole room), so Mochi
 * notices the cursor anywhere nearby, not just when hovered directly.
 *
 * Attach the returned ref to the container:
 *
 *   const roomRef = useCursorAwareness()
 *   <div ref={roomRef}> ... <Character/> ... </div>
 *
 * Performance: listeners are passive, positions are normalized and
 * written straight into the imperative gaze channel — no React state,
 * no renders. On touch devices there's no hovering cursor to notice,
 * and under prefers-reduced-motion tracking is skipped entirely.
 *
 * Sprint 6.7: raw `pointermove` can fire well above the display's
 * refresh rate on high-poll-rate mice/trackpads — every one of those
 * used to write straight into the gaze channel, which meant
 * ProceduralLayer's look-tracking spring could receive several target
 * updates within a single animation frame, none of which it could
 * actually render in between. That's wasted work, not smoother
 * tracking. Coalescing to one `gaze.set()` per animation frame (always
 * using the *latest* pointer position) removes the redundant writes
 * without changing the tracking itself — the spring in ProceduralLayer
 * still owns all the actual smoothing/easing.
 */
export function useCursorAwareness() {
    const engine = useCharacterEngine()
    const elementRef = useRef<HTMLElement | null>(null)
    const cleanupRef = useRef<(() => void) | null>(null)

    useEffect(
        () => () => {
            cleanupRef.current?.()
            cleanupRef.current = null
        },
        [],
    )

    return useCallback(
        (element: HTMLElement | null) => {
            cleanupRef.current?.()
            cleanupRef.current = null
            elementRef.current = element
            if (!element || prefersReducedMotion()) return

            let rafId: number | null = null
            let pendingTarget: { x: number; y: number } | null | undefined

            const flush = () => {
                rafId = null
                if (pendingTarget !== undefined) {
                    engine.gaze.set(pendingTarget)
                    pendingTarget = undefined
                }
            }

            const handleMove = (event: PointerEvent) => {
                if (event.pointerType !== 'mouse') return // no cursor to follow on touch
                const rect = element.getBoundingClientRect()
                const centerX = rect.left + rect.width / 2
                const centerY = rect.top + rect.height * 0.55 // Mochi sits below center
                pendingTarget = {
                    x: Math.max(-1, Math.min(1, (event.clientX - centerX) / (rect.width / 2))),
                    y: Math.max(-1, Math.min(1, (event.clientY - centerY) / (rect.height / 2))),
                }
                if (rafId === null) rafId = requestAnimationFrame(flush)
            }
            const handleLeave = () => {
                pendingTarget = null
                if (rafId === null) rafId = requestAnimationFrame(flush)
            }

            element.addEventListener('pointermove', handleMove, { passive: true })
            element.addEventListener('pointerleave', handleLeave, { passive: true })
            cleanupRef.current = () => {
                element.removeEventListener('pointermove', handleMove)
                element.removeEventListener('pointerleave', handleLeave)
                if (rafId !== null) cancelAnimationFrame(rafId)
                engine.gaze.set(null)
            }
        },
        [engine],
    )
}