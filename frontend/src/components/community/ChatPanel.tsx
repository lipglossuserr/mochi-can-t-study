import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { playMeow, useCommunityChat, usePawBurst } from '@/features/community'

interface ChatPanelProps {
  communityId: number
  slug: string
  currentUid: string | null
}

/**
 * Live per-community chat — Community Rooms, Phase 6. Thin UI over
 * `useCommunityChat`; all the real-time/retry/rate-limit logic lives
 * there. Auto-scrolls to the newest message on load and whenever a new
 * one arrives, but not while the person has scrolled up to read
 * history — same "don't yank the scroll position out from under
 * someone reading" courtesy a chat UI needs.
 */
function ChatPanel({ communityId, slug, currentUid }: ChatPanelProps) {
  const { messages, connectionError, sending, sendError, sendMessage, dismissSendError } = useCommunityChat(
    communityId,
    slug,
    currentUid,
  )
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const { layer: pawLayer, trigger: triggerPaws } = usePawBurst()

  useEffect(() => {
    if (stickToBottomRef.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messages])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed || sending) return
    setDraft('')
    stickToBottomRef.current = true
    triggerPaws()
    // Easter egg: typing the actual word "meow" guarantees the sound
    // (not just the usual 20% chance) — a small, discoverable reward
    // for anyone who tries it, on top of the existing random chance.
    if (/\bmeow\b/i.test(trimmed) || Math.random() < 0.2) playMeow()
    await sendMessage(trimmed)
  }

  return (
    <div className="cat-cursor flex flex-col overflow-hidden rounded-[1.75rem] border border-white/55 bg-white/50 shadow-[0_18px_50px_-20px_rgba(168,106,138,0.45)] backdrop-blur-xl">
      <div className="flex items-center gap-2 border-b border-white/50 bg-white/40 px-5 py-3">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-matcha opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-matcha" />
        </span>
        <span className="font-body text-xs font-semibold text-ink/50">Live</span>
      </div>

      {connectionError && (
        <div className="border-b border-butter/40 bg-butter/30 px-5 py-2 font-body text-xs text-berry">
          {connectionError}
        </div>
      )}

      <div ref={scrollRef} onScroll={handleScroll} className="flex h-96 flex-col gap-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 && !connectionError && (
          <div className="m-auto flex flex-col items-center gap-1.5 text-center">
            <span className="text-2xl opacity-60">🐾</span>
            <p className="font-body text-sm text-ink/40">No messages yet — say hi ♡</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((message) => {
            const isSelf = currentUid !== null && message.authorUid === currentUid
            const label = isSelf ? 'You' : shortUid(message.authorUid)
            return (
              <motion.div
                key={message.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={`flex items-end gap-2 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  aria-hidden="true"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-taro-light to-blush-light font-body text-[10px] font-bold text-taro-dark"
                >
                  {label.slice(-2).toUpperCase()}
                </div>
                <div className={`flex max-w-[75%] flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                  <span className="mb-0.5 px-1 font-body text-[10px] text-ink/35">{label}</span>
                  <div
                    className={`rounded-2xl px-3.5 py-2 font-body text-sm leading-relaxed ${
                      isSelf
                        ? 'rounded-br-md bg-taro text-white shadow-sm shadow-taro/30'
                        : 'rounded-bl-md bg-white/85 text-ink shadow-sm'
                    }`}
                  >
                    {message.body}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {sendError && (
        <div className="border-t border-white/40 bg-berry/5 px-5 py-2 font-body text-xs text-berry">
          {sendError}{' '}
          <button type="button" onClick={dismissSendError} className="font-semibold underline">
            dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-white/50 bg-white/30 p-4">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Say something…"
          maxLength={2000}
          className="w-full rounded-full border border-white/70 bg-white/80 px-4 py-2.5 font-body text-sm text-ink shadow-sm outline-none transition-shadow placeholder:text-ink/35 focus:border-taro focus:shadow-md focus:shadow-taro/10"
        />
        <motion.button
          type="submit"
          disabled={sending || !draft.trim()}
          whileTap={{ scale: 0.92 }}
          className="cat-ears relative shrink-0 rounded-full bg-taro px-5 py-2.5 font-body text-sm font-semibold text-white shadow-sm shadow-taro/30 transition-colors hover:bg-taro-dark disabled:opacity-50 disabled:shadow-none"
        >
          {pawLayer}
          {sending ? '…' : 'Send'}
        </motion.button>
      </form>
    </div>
  )
}

function shortUid(uid: string): string {
  return `Member ${uid.slice(0, 6)}`
}

export default ChatPanel
