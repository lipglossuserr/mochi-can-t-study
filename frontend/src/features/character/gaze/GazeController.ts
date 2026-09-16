/**
 * GazeController — the cursor-awareness channel of the Character Engine.
 *
 * Pointer position changes ~60 times a second; pushing that through
 * React state (or the engine's snapshot) would re-render the tree on
 * every mouse move. So gaze is deliberately a SEPARATE, imperative
 * channel: screens feed it normalized coordinates, renderers subscribe
 * and drive the DOM directly (refs + requestAnimationFrame). Nothing
 * here ever triggers a React render.
 *
 * Coordinates are normalized to [-1, 1] relative to the character
 * (x: -1 = far left, 1 = far right; y likewise), so renderers of any
 * size interpret them identically. `null` means "no cursor nearby —
 * return to neutral".
 */
export interface GazeTarget {
    x: number
    y: number
}

type GazeListener = (target: GazeTarget | null) => void

export class GazeController {
    private target: GazeTarget | null = null
    private listeners = new Set<GazeListener>()

    set(target: GazeTarget | null): void {
        this.target = target
        this.listeners.forEach((listener) => listener(target))
    }

    get(): GazeTarget | null {
        return this.target
    }

    subscribe(listener: GazeListener): () => void {
        this.listeners.add(listener)
        listener(this.target)
        return () => {
            this.listeners.delete(listener)
        }
    }

    dispose(): void {
        this.listeners.clear()
        this.target = null
    }
}