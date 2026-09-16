import { useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CreatePostRequest, Post, PostType } from '@/features/community'

interface CreatePostModalProps {
  submitting: boolean
  error: string | null
  onSubmit: (payload: CreatePostRequest) => Promise<Post | null>
  onClose: () => void
}

const TYPE_OPTIONS: { value: PostType; label: string; emoji: string }[] = [
  { value: 'ROOM_SHARE', label: 'Room share', emoji: '🔗' },
  { value: 'HELP_REQUEST', label: 'Help request', emoji: '🙋' },
  { value: 'VENT', label: 'Vent', emoji: '💭' },
  { value: 'POLL', label: 'Poll', emoji: '📊' },
]

/**
 * Same modal shell as `CreateCommunityModal` — one shared visual
 * language for "create X" across the app. Fields shown depend on the
 * selected type, matching what `PostService.create` actually requires
 * server-side: ROOM_SHARE needs a code, HELP_REQUEST/VENT need a body,
 * POLL needs 2-10 options. `isAnonymous` is offered for every type
 * except ROOM_SHARE (an anonymous room invite doesn't make much
 * sense) and POLL (a poll's whole point is usually knowing who's
 * asking) — kept simple in Phase 2 rather than over-configuring.
 */
function CreatePostModal({ submitting, error, onSubmit, onClose }: CreatePostModalProps) {
  const [type, setType] = useState<PostType>('HELP_REQUEST')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [studyRoomCode, setStudyRoomCode] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [validationError, setValidationError] = useState<string | null>(null)

  const updateOption = (index: number, value: string) =>
    setPollOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)))

  const addOption = () => setPollOptions((prev) => (prev.length < 10 ? [...prev, ''] : prev))
  const removeOption = (index: number) => setPollOptions((prev) => prev.filter((_, i) => i !== index))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setValidationError('Give this post a title first ♡')
      return
    }
    if (type === 'ROOM_SHARE' && !studyRoomCode.trim()) {
      setValidationError('A room share needs a room code')
      return
    }
    if ((type === 'HELP_REQUEST' || type === 'VENT') && !body.trim()) {
      setValidationError('Say a bit more in the body')
      return
    }
    if (type === 'POLL') {
      const nonBlank = pollOptions.map((o) => o.trim()).filter(Boolean)
      if (nonBlank.length < 2) {
        setValidationError('A poll needs at least 2 options')
        return
      }
    }
    setValidationError(null)

    const payload: CreatePostRequest = {
      type,
      title: trimmedTitle,
      body: body.trim() ? body.trim() : null,
      anonymous: type === 'ROOM_SHARE' || type === 'POLL' ? false : isAnonymous,
      studyRoomCode: type === 'ROOM_SHARE' ? studyRoomCode.trim() : undefined,
      pollOptions: type === 'POLL' ? pollOptions.map((o) => o.trim()).filter(Boolean) : undefined,
    }

    const created = await onSubmit(payload)
    if (created) onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-6 py-10 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          onClick={(event) => event.stopPropagation()}
          className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] bg-cream p-8 shadow-2xl"
        >
          <h3 className="font-display text-lg font-semibold text-ink">New post</h3>

          {(validationError || error) && (
            <p className="mt-3 rounded-2xl bg-blush/20 px-4 py-2 text-center font-body text-sm text-berry">
              {validationError ?? error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            <div>
              <span className="font-body text-xs font-semibold text-ink/60">Type</span>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setType(option.value)}
                    className={`rounded-2xl border px-3 py-2.5 font-body text-sm font-semibold transition-colors ${
                      type === option.value
                        ? 'border-taro bg-taro text-white'
                        : 'border-white/60 bg-white/70 text-ink/60'
                    }`}
                  >
                    {option.emoji} {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="post-title" className="font-body text-xs font-semibold text-ink/60">
                Title
              </label>
              <input
                id="post-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                className="mt-1 w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-2.5 font-body text-sm text-ink outline-none focus:border-taro"
              />
            </div>

            {type === 'ROOM_SHARE' && (
              <div>
                <label htmlFor="post-room-code" className="font-body text-xs font-semibold text-ink/60">
                  Room code
                </label>
                <input
                  id="post-room-code"
                  type="text"
                  placeholder="CHEM-101"
                  value={studyRoomCode}
                  onChange={(event) => setStudyRoomCode(event.target.value)}
                  maxLength={64}
                  className="mt-1 w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-2.5 font-body text-sm text-ink outline-none focus:border-taro"
                />
              </div>
            )}

            {(type === 'HELP_REQUEST' || type === 'VENT' || type === 'ROOM_SHARE') && (
              <div>
                <label htmlFor="post-body" className="font-body text-xs font-semibold text-ink/60">
                  {type === 'ROOM_SHARE' ? (
                    <>
                      Note <span className="font-normal text-ink/40">(optional)</span>
                    </>
                  ) : (
                    'What\'s going on?'
                  )}
                </label>
                <textarea
                  id="post-body"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  maxLength={2000}
                  rows={4}
                  className="mt-1 w-full resize-none rounded-2xl border border-white/60 bg-white/70 px-4 py-2.5 font-body text-sm text-ink outline-none focus:border-taro"
                />
              </div>
            )}

            {type === 'POLL' && (
              <div>
                <span className="font-body text-xs font-semibold text-ink/60">Options</span>
                <div className="mt-1.5 flex flex-col gap-2">
                  {pollOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(event) => updateOption(index, event.target.value)}
                        maxLength={120}
                        className="w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-2 font-body text-sm text-ink outline-none focus:border-taro"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="shrink-0 font-body text-xs text-ink/40 hover:text-berry"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {pollOptions.length < 10 && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="mt-2 font-body text-xs font-semibold text-taro-dark"
                  >
                    + Add option
                  </button>
                )}
              </div>
            )}

            {(type === 'HELP_REQUEST' || type === 'VENT') && (
              <label className="flex items-center gap-2 font-body text-xs text-ink/60">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(event) => setIsAnonymous(event.target.checked)}
                  className="rounded border-white/60"
                />
                Post anonymously (shown as "Anonymous member" to others)
              </label>
            )}

            <div className="mt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full border border-white/60 bg-white/70 px-6 py-2.5 font-body text-sm font-semibold text-ink/70"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-full bg-taro px-6 py-2.5 font-body text-sm font-semibold text-white shadow-lg shadow-taro/30 transition-colors hover:bg-taro-dark disabled:opacity-60"
              >
                {submitting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default CreatePostModal
