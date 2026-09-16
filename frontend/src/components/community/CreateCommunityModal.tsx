import { useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/auth/AuthContext'
import type { CommunityVisibility, CreateCommunityRequest } from '@/features/community'
import ImageUploadField from './ImageUploadField'

interface CreateCommunityModalProps {
  submitting: boolean
  error: string | null
  onSubmit: (payload: CreateCommunityRequest) => Promise<boolean>
  onClose: () => void
}

/**
 * Same modal shell (backdrop-blur overlay + scale-in card) and input
 * styling as `TaskFormModal` — one visual language for "create X"
 * across the app rather than a second one invented for communities.
 * Any authenticated user may create a community (see
 * `CommunityService.create`'s doc comment for the policy) and becomes
 * its admin immediately.
 */
function CreateCommunityModal({ submitting, error, onSubmit, onClose }: CreateCommunityModalProps) {
  const { currentUser } = useAuth()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<CommunityVisibility>('PUBLIC')
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setValidationError('Give your community a name first ♡')
      return
    }
    setValidationError(null)

    const ok = await onSubmit({
      name: trimmedName,
      description: description.trim() ? description.trim() : null,
      visibility,
      iconUrl,
    })
    if (ok) onClose()
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
          <h3 className="font-display text-lg font-semibold text-ink">New community</h3>
          <p className="mt-1 font-body text-xs text-ink/50">
            You'll be its admin — able to approve members if it's private.
          </p>

          {(validationError || error) && (
            <p className="mt-3 rounded-2xl bg-blush/20 px-4 py-2 text-center font-body text-sm text-berry">
              {validationError ?? error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            <div>
              <label htmlFor="community-name" className="font-body text-xs font-semibold text-ink/60">
                Name
              </label>
              <input
                id="community-name"
                type="text"
                placeholder="iUT"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                className="mt-1 w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-2.5 font-body text-sm text-ink outline-none focus:border-taro"
              />
            </div>

            <ImageUploadField
              label="Icon (optional)"
              value={iconUrl}
              onChange={setIconUrl}
              previewClassName="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br from-taro-light to-blush-light"
              buildPath={(file) => {
                const uid = currentUser?.uid ?? 'unknown'
                const ext = file.name.split('.').pop() ?? 'jpg'
                return `community-icons/${uid}/${Date.now()}.${ext}`
              }}
            />

            <div>
              <label htmlFor="community-description" className="font-body text-xs font-semibold text-ink/60">
                Description <span className="font-normal text-ink/40">(optional)</span>
              </label>
              <textarea
                id="community-description"
                placeholder="What's this space for?"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
                rows={3}
                className="mt-1 w-full resize-none rounded-2xl border border-white/60 bg-white/70 px-4 py-2.5 font-body text-sm text-ink outline-none focus:border-taro"
              />
            </div>

            <div>
              <span className="font-body text-xs font-semibold text-ink/60">Visibility</span>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(['PUBLIC', 'PRIVATE'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setVisibility(option)}
                    className={`rounded-2xl border px-4 py-2.5 font-body text-sm font-semibold transition-colors ${
                      visibility === option
                        ? 'border-taro bg-taro text-white'
                        : 'border-white/60 bg-white/70 text-ink/60'
                    }`}
                  >
                    {option === 'PUBLIC' ? '🌸 Public' : '🔒 Private'}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 font-body text-xs text-ink/40">
                {visibility === 'PUBLIC'
                  ? 'Anyone can join instantly.'
                  : 'New members need your approval to join.'}
              </p>
            </div>

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
                {submitting ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default CreateCommunityModal
