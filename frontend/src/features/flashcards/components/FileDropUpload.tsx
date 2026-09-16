import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from 'react'

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.pptx', '.txt', '.md', '.zip']
const MAX_FILE_BYTES = 15 * 1024 * 1024

interface FileDropUploadProps {
    file: File | null
    onFileSelect: (file: File | null) => void
}

function FileDropUpload({ file, onFileSelect }: FileDropUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [localError, setLocalError] = useState<string | null>(null)

    const validateAndSelect = useCallback(
        (candidate: File | undefined) => {
            if (!candidate) return
            const extension = `.${candidate.name.split('.').pop()?.toLowerCase() ?? ''}`
            if (!ACCEPTED_EXTENSIONS.includes(extension)) {
                setLocalError('Please upload a PDF, DOCX, PPTX, TXT, Markdown, or ZIP file.')
                return
            }
            if (candidate.size > MAX_FILE_BYTES) {
                setLocalError('That file is too large — please keep it under 15MB.')
                return
            }
            setLocalError(null)
            onFileSelect(candidate)
        },
        [onFileSelect],
    )

    return (
        <div>
            <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(event: DragEvent<HTMLDivElement>) => {
                    event.preventDefault()
                    setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event: DragEvent<HTMLDivElement>) => {
                    event.preventDefault()
                    setIsDragging(false)
                    validateAndSelect(event.dataTransfer.files[0])
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click()
                }}
                className={`glitter-surface relative flex cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-[2rem] border-2 border-dashed px-6 py-12 text-center transition-all duration-200 ${
                    isDragging
                        ? 'scale-[1.01] border-taro bg-blush-light/50 shadow-[0_20px_50px_-20px_rgba(224,112,158,0.55)]'
                        : 'border-taro-light/70 bg-white/40 hover:border-taro hover:bg-white/55'
                }`}
            >
                <span className="sparkle absolute left-6 top-5 text-base text-taro-light/80" aria-hidden="true">✦</span>
                <span className="sparkle absolute right-8 top-9 text-sm text-blush/70" aria-hidden="true" style={{ animationDelay: '0.8s' }}>✦</span>
                <span className="sparkle absolute bottom-6 left-10 text-xs text-rosegold/70" aria-hidden="true" style={{ animationDelay: '1.6s' }}>✦</span>

                <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPTED_EXTENSIONS.join(',')}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => validateAndSelect(event.target.files?.[0])}
                    className="hidden"
                />

                <span className="text-4xl" aria-hidden="true">{file ? '📄' : '✨'}</span>

                {file ? (
                    <div>
                        <p className="font-display text-base font-semibold text-ink/85">{file.name}</p>
                        <p className="mt-0.5 font-body text-xs text-ink/50">{(file.size / 1024 / 1024).toFixed(2)} MB — tap to replace</p>
                    </div>
                ) : (
                    <div>
                        <p className="font-display text-base font-semibold text-ink/80">Drop your study material here</p>
                        <p className="mt-1 font-body text-xs text-ink/50">or tap to browse — PDF, DOCX, PPTX, TXT, Markdown, or ZIP</p>
                    </div>
                )}
            </div>
            {localError && <p className="mt-2 text-center font-body text-xs font-medium text-berry">{localError}</p>}
        </div>
    )
}

export default FileDropUpload