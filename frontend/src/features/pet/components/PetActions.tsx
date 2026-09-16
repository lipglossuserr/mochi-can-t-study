import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface ActionButtonProps {
  emoji: string
  label: string
  onClick: () => void
  pending: boolean
  pendingLabel: string
}

function ActionButton({ emoji, label, onClick, pending, pendingLabel }: ActionButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label={pending ? pendingLabel : label}
      aria-busy={pending}
      whileHover={pending ? undefined : { scale: 1.02 }}
      whileTap={pending ? undefined : { scale: 0.97 }}
      className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/60 bg-white/70 px-6 py-3 font-body text-sm font-semibold text-taro shadow transition-colors hover:bg-blush-light disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-taro/30 border-t-taro"
          aria-hidden="true"
        />
      ) : (
        <span aria-hidden="true">{emoji}</span>
      )}
      {pending ? pendingLabel : label}
    </motion.button>
  )
}

interface PetActionsProps {
  onFeed: () => void
  onPlay: () => void
  isFeeding: boolean
  isPlaying: boolean
  /** Optional extra content rendered alongside Feed/Play, e.g. a Start Study button. */
  children?: ReactNode
}

/** Quick Actions row: Feed and Play, both calling into the pet feature's actions. */
function PetActions({ onFeed, onPlay, isFeeding, isPlaying, children }: PetActionsProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <ActionButton
        emoji="🍙"
        label="Feed Mochi"
        pendingLabel="Feeding…"
        onClick={onFeed}
        pending={isFeeding}
      />
      <ActionButton
        emoji="🎈"
        label="Play with Mochi"
        pendingLabel="Playing…"
        onClick={onPlay}
        pending={isPlaying}
      />
      {children}
    </div>
  )
}

export default PetActions
