import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { drawRecapCard, RECAP_CARD_SIZE, type RecapCardData } from './drawRecapCard'

/**
 * ShareRecapButton + the modal it opens.
 *
 * Kept as one file (button + modal) rather than split — the button has
 * no meaningful standalone identity outside "opens this modal," and
 * every other lightweight modal in this codebase (ReportModal in
 * StudyWithOthersPage, for one) follows the same
 * component-colocated-with-its-trigger shape.
 */

/** Feature-detected once at module load, not per-render — `navigator.share`/`canShare` don't change mid-session. */
const supportsFileShare =
  typeof navigator !== 'undefined' &&
  typeof navigator.share === 'function' &&
  typeof navigator.canShare === 'function'

function RecapCardModal({ data, onClose }: { data: RecapCardData; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    // Canvas text uses whatever's already loaded in `document.fonts` at
    // draw time — with no await here, a cold page load could draw the
    // headline in a fallback system font before Fredoka/Plus Jakarta
    // Sans finish loading. `document.fonts.ready` resolves once
    // whatever's already been requested (both are pulled in via the
    // app's global stylesheet) has settled — it doesn't request
    // anything on its own.
    void document.fonts.ready.then(() => {
      if (cancelled) return
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = RECAP_CARD_SIZE.width
      canvas.height = RECAP_CARD_SIZE.height
      drawRecapCard(canvas, data)
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [data])

  const toBlob = (): Promise<Blob | null> =>
    new Promise((resolve) => {
      const canvas = canvasRef.current
      if (!canvas) return resolve(null)
      canvas.toBlob(resolve, 'image/png')
    })

  const handleDownload = async () => {
    const blob = await toBlob()
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `mochi-study-recap-${data.dateLabel.replace(/[^\w]+/g, '-')}.png`
    link.click()
    // Revoke on the next tick rather than immediately — some browsers
    // haven't finished the download handoff synchronously.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const handleShare = async () => {
    setShareError(null)
    const blob = await toBlob()
    if (!blob) return
    const file = new File([blob], 'mochi-study-recap.png', { type: 'image/png' })
    if (!navigator.canShare?.({ files: [file] })) {
      // The feature-detect above only confirms the API shape exists,
      // not that THIS payload (a file) is shareable on this device —
      // some browsers support navigator.share for text/links only.
      // Silently fall back to download rather than surfacing this as
      // an error the user needs to understand.
      await handleDownload()
      return
    }
    setSharing(true)
    try {
      await navigator.share({
        files: [file],
        title: 'My Mochi study recap',
        text: 'Just wrapped a study session with Mochi ♡',
      })
    } catch (err) {
      // AbortError = the user just closed the native share sheet —
      // not a real failure, don't show an error for it.
      if (err instanceof Error && err.name !== 'AbortError') {
        setShareError("Couldn't open sharing — you can still download the image below.")
      }
    } finally {
      setSharing(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-[2rem] border border-white/60 bg-white/80 p-6 text-center shadow-[0_24px_65px_-18px_rgba(224,112,158,0.42)] backdrop-blur-xl"
      >
        <h3 className="font-display text-lg font-semibold text-ink">Share your recap</h3>
        <p className="mt-1 font-body text-sm text-ink/60">A little card to keep or share ♡</p>

        <div className="relative mt-4 overflow-hidden rounded-2xl border border-blush-light/60 bg-petal shadow-inner">
          {/* The canvas itself is drawn at full RECAP_CARD_SIZE resolution
              (1080×1350) — CSS just scales the on-screen preview down to
              fit the modal. toBlob()/toDataURL() always operate on the
              full-resolution pixels regardless of display size. */}
          <motion.canvas
            ref={canvasRef}
            className="block w-full"
            style={{ aspectRatio: '1080 / 1350' }}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={ready ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
          <AnimatePresence>
            {!ready && (
              <motion.div
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-petal"
              >
                <div className="vibe-shimmer h-24 w-24 rounded-3xl bg-white/70" aria-hidden="true" />
                <motion.span
                  className="font-body text-sm text-ink/40"
                  animate={{ opacity: [0.4, 0.9, 0.4] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                >
                  Preparing your card…
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
          {/* A brief sparkle beat the instant the card finishes rendering
              — purely celebratory, not tied to any state beyond "just
              became ready"; AnimatePresence's exit lets it play once and
              disappear rather than needing its own timer to clean up. */}
          <AnimatePresence>
            {ready && (
              <motion.div
                key="sparkle"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.1, delay: 0.2 }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center text-4xl"
                aria-hidden="true"
              >
                ✨
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {shareError && <p className="mt-3 font-body text-xs text-berry">{shareError}</p>}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full bg-white px-4 py-2.5 font-body text-sm font-semibold text-ink/70 shadow hover:bg-blush-light"
          >
            Close
          </button>
          {supportsFileShare && (
            <button
              type="button"
              onClick={() => void handleShare()}
              disabled={!ready || sharing}
              className="flex-1 rounded-full bg-taro px-4 py-2.5 font-body text-sm font-semibold text-white shadow transition-colors hover:bg-taro-dark disabled:opacity-50"
            >
              {sharing ? 'Sharing…' : 'Share'}
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={!ready}
            className="flex-1 rounded-full bg-taro px-4 py-2.5 font-body text-sm font-semibold text-white shadow transition-colors hover:bg-taro-dark disabled:opacity-50"
          >
            Download
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function ShareRecapButton({ data }: { data: RecapCardData }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(true)}
        className="shine-sweep mt-3 rounded-full border border-taro/30 bg-white px-6 py-2.5 font-body text-sm font-semibold text-taro-dark shadow transition-colors hover:bg-taro-light/40"
      >
        📤 Share recap
      </motion.button>
      {open && <RecapCardModal data={data} onClose={() => setOpen(false)} />}
    </>
  )
}

export default ShareRecapButton
