import { AnimatePresence, motion } from 'framer-motion'

interface ToastProps {
  message: string | null
  onDismiss?: () => void
  tone?: 'error' | 'info'
}

/**
 * Toast
 *
 * A small, dismissible banner for transient feedback — a failed Feed,
 * a session action that didn't go through, a connectivity hiccup.
 * Never a browser alert(). Visibility is entirely controlled by
 * `message`: pass null to hide it, a new string to show it again.
 */
function Toast({ message, onDismiss, tone = 'error' }: ToastProps) {
  const toneClasses =
    tone === 'error'
      ? 'bg-blush/20 text-berry border-blush/40'
      : 'bg-white/70 text-ink border-white/60'

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          role="alert"
          className={`mx-auto flex w-full max-w-md items-center justify-between gap-3 rounded-2xl border px-4 py-3 font-body text-sm shadow ${toneClasses}`}
        >
          <span>{message}</span>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss"
              className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold opacity-60 transition-opacity hover:opacity-100"
            >
              ✕
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default Toast
