import { useRef, useState } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { markdownLiteToHtml } from '@/features/community/utils/markdownLite'
import ImageUploadField from './ImageUploadField'

interface BlogEditorProps {
  /** Null while the parent's `useCommunity` is still loading — the upload field just stays disabled-by-omission until it resolves, same as any other community-scoped action gated on that fetch. */
  communityId: number | null
  title: string
  coverImageUrl: string
  body: string
  onTitleChange: (title: string) => void
  onCoverImageUrlChange: (url: string) => void
  onBodyChange: (body: string) => void
}

type ToolbarAction = 'h2' | 'h3' | 'bold' | 'italic' | 'list' | 'link'

/**
 * The blog composer's body editor: a plain textarea plus a toolbar
 * that inserts the same lightweight syntax `markdownLiteToHtml`
 * understands, with a toggleable live preview. Not a rich-text/WYSIWYG
 * editor (e.g. TipTap) — this sandbox has no package-registry access
 * to install one, so a dependency-free textarea-based editor is the
 * pragmatic v1 here. `title`/`coverImageUrl`/`body` are fully
 * controlled by the parent (the composer page), matching every other
 * form in this codebase (`CreatePostModal` etc.) rather than owning
 * its own draft state.
 * <p>
 * The cover field offers both a real upload (v2 backlog — see
 * `ImageUploadField`) and the original paste-a-URL text input side by
 * side, rather than replacing one with the other: an uploaded image
 * and an external URL both just end up as the same `coverImageUrl`
 * string, so there's no reason to force a single input path.
 */
function BlogEditor({
  communityId,
  title,
  coverImageUrl,
  body,
  onTitleChange,
  onCoverImageUrlChange,
  onBodyChange,
}: BlogEditorProps) {
  const { currentUser } = useAuth()
  const [showPreview, setShowPreview] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const wrapSelection = (before: string, after: string = before) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const { selectionStart, selectionEnd, value } = textarea
    const selected = value.slice(selectionStart, selectionEnd)
    const next = `${value.slice(0, selectionStart)}${before}${selected}${after}${value.slice(selectionEnd)}`
    onBodyChange(next)
    // Restore focus + selection after React re-renders the controlled value.
    requestAnimationFrame(() => {
      textarea.focus()
      const cursor = selectionStart + before.length + selected.length + after.length
      textarea.setSelectionRange(cursor, cursor)
    })
  }

  const prefixLine = (prefix: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const { selectionStart, value } = textarea
    const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
    const next = `${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`
    onBodyChange(next)
    requestAnimationFrame(() => {
      textarea.focus()
      const cursor = selectionStart + prefix.length
      textarea.setSelectionRange(cursor, cursor)
    })
  }

  const handleToolbar = (action: ToolbarAction) => {
    switch (action) {
      case 'h2':
        prefixLine('# ')
        break
      case 'h3':
        prefixLine('## ')
        break
      case 'bold':
        wrapSelection('**')
        break
      case 'italic':
        wrapSelection('*')
        break
      case 'list':
        prefixLine('- ')
        break
      case 'link':
        wrapSelection('[', '](https://)')
        break
    }
  }

  const toolbarButtons: { action: ToolbarAction; label: string; title: string }[] = [
    { action: 'h2', label: 'H2', title: 'Heading' },
    { action: 'h3', label: 'H3', title: 'Subheading' },
    { action: 'bold', label: 'B', title: 'Bold' },
    { action: 'italic', label: 'I', title: 'Italic' },
    { action: 'list', label: '•', title: 'Bullet list' },
    { action: 'link', label: '🔗', title: 'Link' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor="blog-title" className="font-body text-xs font-semibold text-ink/60">
          Title
        </label>
        <input
          id="blog-title"
          type="text"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          maxLength={200}
          placeholder="Give it a title…"
          className="mt-1 w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-2.5 font-display text-xl font-semibold text-ink outline-none focus:border-taro"
        />
      </div>

      <div className="flex flex-col gap-3">
        {communityId !== null && (
          <ImageUploadField
            label="Cover image"
            value={coverImageUrl || null}
            onChange={(url) => onCoverImageUrlChange(url ?? '')}
            previewClassName="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br from-taro-light to-blush-light"
            buildPath={(file) => {
              const uid = currentUser?.uid ?? 'unknown'
              const ext = file.name.split('.').pop() ?? 'jpg'
              return `blog-covers/${communityId}/${uid}/${Date.now()}.${ext}`
            }}
          />
        )}
        <div>
          <label htmlFor="blog-cover" className="font-body text-xs font-semibold text-ink/60">
            {communityId !== null ? 'Or paste an image URL' : 'Cover image URL'}{' '}
            <span className="font-normal text-ink/40">(optional)</span>
          </label>
          <input
            id="blog-cover"
            type="url"
            value={coverImageUrl}
            onChange={(event) => onCoverImageUrlChange(event.target.value)}
            maxLength={500}
            placeholder="https://…"
            className="mt-1 w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-2.5 font-body text-sm text-ink outline-none focus:border-taro"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className="font-body text-xs font-semibold text-ink/60">Body</span>
          <button
            type="button"
            onClick={() => setShowPreview((prev) => !prev)}
            className="font-body text-xs font-semibold text-taro-dark"
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
        </div>

        {!showPreview && (
          <>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {toolbarButtons.map((btn) => (
                <button
                  key={btn.action}
                  type="button"
                  title={btn.title}
                  onClick={() => handleToolbar(btn.action)}
                  className="rounded-xl border border-white/60 bg-white/70 px-3 py-1.5 font-body text-xs font-semibold text-ink/70 hover:bg-white"
                >
                  {btn.label}
                </button>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              id="blog-body"
              value={body}
              onChange={(event) => onBodyChange(event.target.value)}
              rows={16}
              placeholder="Write your post… ## for a subheading, **bold**, *italic*, - for a list, [text](https://url) for a link"
              className="mt-2 w-full resize-y rounded-2xl border border-white/60 bg-white/70 px-4 py-3 font-body text-sm leading-relaxed text-ink outline-none focus:border-taro"
            />
          </>
        )}

        {showPreview && (
          <div
            className="prose prose-sm mt-2 min-h-[16rem] max-w-none rounded-2xl border border-white/60 bg-white/70 px-4 py-3 font-body text-sm leading-relaxed text-ink"
            // Safe: markdownLiteToHtml escapes all raw input before adding its own markup — see that function's javadoc.
            dangerouslySetInnerHTML={{ __html: markdownLiteToHtml(body) || '<p class="text-ink/40">Nothing to preview yet.</p>' }}
          />
        )}
      </div>
    </div>
  )
}

export default BlogEditor
