import { useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FadeInSection from '@/components/FadeInSection'

interface ComingSoonPageProps {
  emoji: string
  title: string
  description: string
}

/**
 * ComingSoonPage
 *
 * A single reusable placeholder for rooms that don't have real
 * content yet (Flashcards, Study with Others, Community...). Adding
 * a future room here is just another <Route> with different props —
 * no new component. Dressed up with the same ambient blobs and
 * "breathing" motion language as the rest of the app, plus a tiny
 * interactive touch: hovering the emoji makes it perk up, and the
 * notify-me form gives a small, real bit of delight on submit even
 * though nothing is wired up on the backend yet.
 */
function ComingSoonPage({ emoji, title, description }: ComingSoonPageProps) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim()) return
    setSubmitted(true)
  }

  return (
    <div className="relative mx-auto w-full max-w-3xl">
      {/* ambient blobs, same drifting-light language used across the app */}
      <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-matcha-light/40 blur-3xl ambient-blob-a" />
      <div className="pointer-events-none absolute -right-10 bottom-0 h-56 w-56 rounded-full bg-taro/20 blur-3xl ambient-blob-b" />

      <FadeInSection className="relative overflow-hidden rounded-[2.5rem] border border-white/50 bg-white/45 p-10 text-center shadow-[0_20px_60px_-15px_rgba(224,112,158,0.4)] backdrop-blur-xl">
        {/* a few lazy sparkles, echoing the study-room's twinkle */}
        <span className="sparkle absolute left-8 top-8 text-blush" aria-hidden="true">✦</span>
        <span className="sparkle absolute right-10 top-14 text-taro" style={{ animationDelay: '0.8s' }} aria-hidden="true">⋆</span>
        <span className="sparkle absolute bottom-10 left-14 text-rosegold" style={{ animationDelay: '1.4s' }} aria-hidden="true">✧</span>

        <motion.p
          className="mochi-breathe inline-block cursor-default text-5xl"
          aria-hidden="true"
          whileHover={{ scale: 1.15, rotate: [0, -8, 8, 0] }}
          transition={{ duration: 0.5 }}
        >
          {emoji}
        </motion.p>

        <h2 className="mt-3 font-display text-xl font-semibold text-ink">{title}</h2>
        <p className="mt-2 font-body text-sm text-ink/60">{description}</p>

        <span className="mt-6 inline-block rounded-full bg-blush-light/70 px-4 py-1.5 font-body text-xs font-semibold uppercase tracking-wide text-taro-dark">
          Coming soon
        </span>

        <div className="mx-auto mt-8 max-w-sm">
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.p
                key="thanks"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="font-body text-sm font-semibold text-matcha"
              >
                🍡 Yay! Mochi will let you know the moment {title} is ready.
              </motion.p>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <label htmlFor={`notify-${title}`} className="sr-only">
                  Email address
                </label>
                <input
                  id={`notify-${title}`}
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="flex-1 rounded-full border border-taro/20 bg-white/80 px-4 py-2.5 font-body text-sm text-ink placeholder:text-ink/40 shadow-sm outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(224,112,158,0.25)]"
                />
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="glow-hover rounded-full bg-taro px-5 py-2.5 font-body text-sm font-semibold text-white shadow-md shadow-taro/30 transition-colors hover:bg-taro-dark"
                >
                  Notify me
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </FadeInSection>
    </div>
  )
}

export default ComingSoonPage
