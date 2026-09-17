import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface PetSpeechBubbleProps {
  /** The line to show. Passing a new string (even a repeat) pops the bubble back up. */
  message: string | null
  /** How long the bubble stays up (once visible) before auto-hiding itself, in ms. */
  autoHideMs?: number
  /** Positioning classes for wherever this bubble sits relative to its parent. */
  className?: string
}

/**
 * A brief pause before the bubble appears (Sprint 5.3A-2): the brief
 * asks that bubbles read as "thoughts" with a motivated appearance, not
 * notifications that fire the instant something happens. This roughly
 * matches the engine's own anticipation beat for one-shot reactions, so
 * a fed/played line tends to land right as her reaction pose starts
 * rather than a beat ahead of it.
 */
const REVEAL_DELAY_MS = 200
/** globals.css's --ease-settle as a literal, since Framer Motion needs
 * a plain cubic-bezier array rather than a CSS custom property here. */
const EASE_SETTLE = [0.34, 1.3, 0.64, 1] as const

/**
 * PetSpeechBubble
 *
 * A small, reusable speech bubble that pops up next to Mochi. It only
 * knows about a `message` string, so it works identically regardless
 * of which renderer is drawing Mochi underneath it (the live Rive
 * asset, or ProceduralLayer's CSS fallback) — it's just absolutely
 * positioned over whichever one is on screen.
 *
 * Fully self-contained: it auto-hides itself after `autoHideMs` (plus
 * the reveal delay), so callers only need to set a new message to show
 * it again.
 */
function PetSpeechBubble({ message, autoHideMs = 2400, className = '' }: PetSpeechBubbleProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!message) {
      setVisible(false)
      return
    }
    const reveal = window.setTimeout(() => setVisible(true), REVEAL_DELAY_MS)
    const hide = window.setTimeout(() => setVisible(false), REVEAL_DELAY_MS + autoHideMs)
    return () => {
      window.clearTimeout(reveal)
      window.clearTimeout(hide)
    }
  }, [message, autoHideMs])

  return (
    <div className={`pointer-events-none absolute z-10 ${className}`}>
      <AnimatePresence>
        {visible && message && (
          <motion.div
            key={message}
            initial={{ opacity: 0, y: 8, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            // A softer, slightly slower fade out than the entrance — she
            // doesn't cut the thought off, it just trails away — and no
            // scale/position snap back, so disappearing reads as natural
            // rather than a UI element being dismissed.
            exit={{ opacity: 0, transition: { duration: 0.3, ease: 'easeInOut' } }}
            transition={{ duration: 0.32, ease: EASE_SETTLE }}
            role="status"
            aria-live="polite"
            className="relative whitespace-nowrap rounded-2xl border border-white/70 bg-white/95 px-4 py-2 font-body text-sm font-semibold text-ink shadow-lg"
          >
            {message}
            <span
              aria-hidden="true"
              className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-white/70 bg-white/95"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PetSpeechBubble
