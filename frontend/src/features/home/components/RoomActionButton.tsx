import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

interface RoomActionButtonProps {
  emoji: string
  label: string
  onClick?: () => void
  to?: string
  pending?: boolean
  pendingLabel?: string
  tone?: 'feed' | 'play' | 'study' | 'decor'
  /** True while this button's tray is the currently-open one — a subtle "pressed" ring so Feed/Decor read as toggles, not one-shot taps. */
  active?: boolean
}

const TONE_CLASSES: Record<NonNullable<RoomActionButtonProps['tone']>, string> = {
  feed: 'bg-gradient-to-b from-butter/80 to-blush-light/70 hover:from-butter hover:to-blush-light',
  play: 'bg-gradient-to-b from-blush-light/80 to-taro-light/70 hover:from-blush-light hover:to-taro-light',
  study: 'bg-gradient-to-b from-matcha-light/80 to-white/70 hover:from-matcha-light hover:to-white',
  decor: 'bg-gradient-to-b from-taro-light/80 to-white/70 hover:from-taro-light hover:to-white',
}

/**
 * RoomActionButton
 *
 * A round, plush "object" sitting in the room — icon tile, a soft
 * floor shadow beneath it, and a label — rather than a rectangular
 * dashboard button. Used for Feed, Play, and Start Study alike, either
 * as a click action or as a doorway link to another room.
 */
function RoomActionButton({
  emoji,
  label,
  onClick,
  to,
  pending = false,
  pendingLabel,
  tone = 'feed',
    active=false,
}: RoomActionButtonProps) {
  const displayLabel = pending && pendingLabel ? pendingLabel : label

  const tile: ReactNode = (
    <>
      {pending ? (
        <span
          className="h-6 w-6 animate-spin rounded-full border-2 border-taro/30 border-t-taro"
          aria-hidden="true"
        />
      ) : (
        <span className="text-3xl sm:text-4xl" aria-hidden="true">
          {emoji}
        </span>
      )}
    </>
  )

  const tileClasses = `glow-hover flex h-20 w-20 items-center justify-center rounded-full border shadow-[0_16px_30px_-12px_rgba(224,112,158,0.5)] backdrop-blur-xl transition-colors sm:h-24 sm:w-24 ${TONE_CLASSES[tone]} ${active ? 'border-taro-dark ring-2 ring-taro-dark/50' : 'border-white/60'}`

  /** A soft ellipse "resting" beneath the tile — the same visual language as the rug under Mochi. */
  const floorShadow = (
    <span
      className="absolute -bottom-1.5 left-1/2 h-2.5 w-12 -translate-x-1/2 rounded-[50%] bg-ink/10 blur-[3px] sm:w-14"
      aria-hidden="true"
    />
  )

  if (to) {
    return (
      <Link to={to} aria-label={label} className="flex flex-col items-center gap-3">
        <span className="relative">
          {floorShadow}
          <motion.span whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }} className={`relative ${tileClasses}`}>
            {tile}
          </motion.span>
        </span>
        <span className="font-body text-xs font-semibold text-ink/70 sm:text-sm">{displayLabel}</span>
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label={displayLabel}
      aria-busy={pending}
      className="flex flex-col items-center gap-3 disabled:cursor-not-allowed"
    >
      <span className="relative">
        {floorShadow}
        <motion.span
          whileHover={pending ? undefined : { scale: 1.06 }}
          whileTap={pending ? undefined : { scale: 0.95 }}
          className={`relative ${tileClasses} ${pending ? 'opacity-70' : ''}`}
        >
          {tile}
        </motion.span>
      </span>
      <span className="font-body text-xs font-semibold text-ink/70 sm:text-sm">{displayLabel}</span>
    </button>
  )
}

export default RoomActionButton
