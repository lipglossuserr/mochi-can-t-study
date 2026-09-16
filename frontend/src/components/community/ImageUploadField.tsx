import { useRef, type ChangeEvent } from 'react'
import { useImageUpload } from '@/features/community'

interface ImageUploadFieldProps {
  value: string | null
  onChange: (url: string | null) => void
  /** Builds the Storage destination path for a given file — see `useImageUpload`'s javadoc for why the caller decides this, not the hook. */
  buildPath: (file: File) => string
  label: string
  previewClassName?: string
}

/**
 * A click-to-upload image field with a live preview, a progress bar
 * while `useImageUpload` is working, and a remove button — used for
 * both community icons (`CreateCommunityModal`) and blog covers
 * (`BlogEditor`). Fully controlled (`value`/`onChange`), matching
 * every other form field in this codebase; the parent still owns
 * whatever request payload `value` ends up in.
 */
function ImageUploadField({ value, onChange, buildPath, label, previewClassName }: ImageUploadFieldProps) {
  const { upload, progress, uploading, error, dismissError } = useImageUpload()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = '' // allow re-selecting the same file later
    if (!file) return
    dismissError()
    const url = await upload(file, buildPath(file))
    if (url) onChange(url)
  }

  return (
    <div>
      <span className="font-body text-xs font-semibold text-ink/60">{label}</span>

      <div className="mt-1.5 flex items-center gap-3">
        <div
          className={
            previewClassName ??
            'flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/60 bg-white/60'
          }
        >
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xl opacity-40" aria-hidden="true">
              🖼
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="rounded-full border border-white/60 bg-white/70 px-4 py-1.5 font-body text-xs font-semibold text-ink/70 hover:bg-white disabled:opacity-50"
            >
              {uploading ? `Uploading… ${progress}%` : value ? 'Replace' : 'Upload image'}
            </button>
            {value && !uploading && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="font-body text-xs text-ink/40 hover:text-berry"
              >
                Remove
              </button>
            )}
          </div>

          {uploading && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/60">
              <div
                className="h-full rounded-full bg-taro transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {error && <p className="font-body text-xs text-berry">{error}</p>}
        </div>
      </div>

      <input ref={inputRef} type="file" accept="image/*" onChange={handleFileSelected} className="hidden" />
    </div>
  )
}

export default ImageUploadField
