type ConfettiListener = (burst: ConfettiBurst) => void

export interface ConfettiBurst {
  /** Which emoji to scatter — kept small and curated per call site rather than fully arbitrary, so a burst always reads as "designed," not random clip-art. */
  emojis: string[]
  /** Roughly how many particles — kept modest (see callers) since this is a celebration accent, not a full-screen takeover. */
  count?: number
}

/**
 * confettiEvents — the same "features emit a fact, a single global
 * layer decides how to render it" seam characterEventBus draws for
 * Mochi's reactions, applied to a screen-wide celebration burst. Kept
 * as its own tiny bus rather than folded into characterEventBus:
 * confetti isn't a Mochi reaction (it's not anchored to her on-screen
 * position, and plenty of callers — the Konami code, a streak
 * milestone — want it without necessarily implying Mochi herself did
 * something), so it deserves its own single-purpose channel rather
 * than overloading a bus that's specifically about her.
 */
class ConfettiEventBus {
  private listeners = new Set<ConfettiListener>()

  on(listener: ConfettiListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  emit(burst: ConfettiBurst): void {
    this.listeners.forEach((listener) => listener(burst))
  }
}

export const confettiEvents = new ConfettiEventBus()
