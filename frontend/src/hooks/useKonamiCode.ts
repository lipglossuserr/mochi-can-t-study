import { useEffect, useRef } from 'react'

const KONAMI_SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
]

/**
 * useKonamiCode
 *
 * A classic gaming easter egg, nothing more — listens globally for
 * ↑↑↓↓←→←→BA and calls `onUnlock` once the full sequence lands in
 * order. Desktop-only by nature (there's no equivalent touch gesture
 * being implied here); mobile users simply never trigger this, which
 * is fine — it's a hidden bonus, not a feature anyone is expected to
 * find without already knowing the code.
 *
 * Resets progress on any wrong key rather than trying to find a
 * partial-match restart point — simplest correct behavior for a
 * sequence this short.
 */
export function useKonamiCode(onUnlock: () => void): void {
  const progressRef = useRef(0)
  const onUnlockRef = useRef(onUnlock)
  onUnlockRef.current = onUnlock

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const expected = KONAMI_SEQUENCE[progressRef.current]
      const matches = event.key.toLowerCase() === expected.toLowerCase()

      if (matches) {
        progressRef.current += 1
        if (progressRef.current === KONAMI_SEQUENCE.length) {
          progressRef.current = 0
          onUnlockRef.current()
        }
      } else {
        // Restart from scratch — but if the wrong key happens to be the
        // sequence's own first key (a stray extra ArrowUp before really
        // starting), count it as the start of a fresh attempt rather
        // than losing it entirely.
        progressRef.current = event.key.toLowerCase() === KONAMI_SEQUENCE[0].toLowerCase() ? 1 : 0
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
