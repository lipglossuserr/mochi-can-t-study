import { useCallback, useState, type CSSProperties, type ReactNode } from 'react'

interface Paw {
  id: number
  dx: number
  dy: number
  rotate: number
}

const BURST_DURATION_MS = 900

/**
 * A tiny paw-print particle burst — same shape as the app's existing
 * "boop the pet" particle effect (see `.boop-particle`/`--boop-dx`/
 * `--boop-dy` in `globals.css`), themed as paw prints and reused for
 * Study Rooms' own delight moments (a message sending, joining a room). Each call to `trigger()` spawns one paw print with a
 * randomized drift direction and rotation, then removes itself once
 * the `.paw-print-particle` CSS animation finishes — no cleanup left
 * for the caller to manage.
 * <p>
 * The parent element must be `position: relative` (or already is,
 * like every card in this codebase) for `layer` to anchor correctly;
 * `layer` renders nothing until `trigger()` is called at least once.
 */
export function usePawBurst() {
  const [paws, setPaws] = useState<Paw[]>([])

  const trigger = useCallback(() => {
    const id = Date.now() + Math.random()
    const dx = Math.round((Math.random() - 0.5) * 44)
    const dy = -(26 + Math.round(Math.random() * 20))
    const rotate = Math.round(-22 + Math.random() * 44)
    setPaws((prev) => [...prev, { id, dx, dy, rotate }])
    setTimeout(() => {
      setPaws((prev) => prev.filter((paw) => paw.id !== id))
    }, BURST_DURATION_MS)
  }, [])

  const layer: ReactNode = paws.map((paw) => (
    <span
      key={paw.id}
      aria-hidden="true"
      className="paw-print-particle pointer-events-none absolute left-1/2 top-0 text-sm"
      style={
        {
          '--paw-dx': `${paw.dx}px`,
          '--paw-dy': `${paw.dy}px`,
          '--paw-rotate': `${paw.rotate}deg`,
        } as CSSProperties
      }
    >
      🐾
    </span>
  ))

  return { layer, trigger }
}
