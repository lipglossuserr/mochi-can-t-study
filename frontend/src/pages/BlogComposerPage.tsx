import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import FadeInSection from '@/components/FadeInSection'
import Toast from '@/components/Toast'
import BlogEditor from '@/components/community/BlogEditor'
import { useBlogPost, useBlogPosts, useCommunity } from '@/features/community'

/**
 * The blog composer — one page handles both "new" (`blogId` is
 * `undefined`, from `/community/:slug/blog/new`) and "edit an existing
 * draft/published post" (`blogId` present, from
 * `/community/:slug/blog/:blogId/edit`), rather than two near-identical
 * pages. A new post is created as a DRAFT on first save (mirroring
 * `BlogPostService.create`'s contract) and the URL is then swapped to
 * the edit route via `navigate(..., { replace: true })` so a page
 * refresh doesn't try to create a second draft.
 */
function BlogComposerPage() {
  const { slug, blogId } = useParams<{ slug: string; blogId?: string }>()
  const navigate = useNavigate()
  const numericBlogId = blogId ? Number(blogId) : null

  const { community } = useCommunity(slug ?? '')

  const { create, actionPendingId, actionError: createError, dismissActionError: dismissCreateError } = useBlogPosts(
    slug ?? '',
    'mine',
  )
  const {
    post,
    loading,
    save,
    saving,
    publish,
    unpublish,
    actionError: editError,
    dismissActionError: dismissEditError,
  } = useBlogPost(slug ?? '', numericBlogId)

  const [title, setTitle] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [body, setBody] = useState('')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (post && !hydrated) {
      setTitle(post.title)
      setCoverImageUrl(post.coverImageUrl ?? '')
      setBody(post.body ?? '')
      setHydrated(true)
    }
  }, [post, hydrated])

  if (!slug) return null

  const isEditingExisting = numericBlogId !== null
  const isSaving = saving || actionPendingId === 'create'
  const error = createError ?? editError

  const handleSaveDraft = async () => {
    if (isEditingExisting) {
      await save({ title, coverImageUrl: coverImageUrl || null, body })
      return
    }
    const created = await create({ title, coverImageUrl: coverImageUrl || null, body })
    if (created) {
      navigate(`/community/${slug}/blog/${created.id}/edit`, { replace: true })
    }
  }

  const handlePublish = async () => {
    if (isEditingExisting) {
      await save({ title, coverImageUrl: coverImageUrl || null, body })
      const published = await publish()
      if (published) navigate(`/community/${slug}/blog/${published.id}`)
      return
    }
    const created = await create({ title, coverImageUrl: coverImageUrl || null, body })
    if (created) {
      navigate(`/community/${slug}/blog/${created.id}/edit`, { replace: true })
    }
  }

  if (isEditingExisting && loading && !hydrated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="animate-pulse rounded-[2.5rem] border border-white/50 bg-white/35 p-10" aria-busy="true" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <FadeInSection>
        <div className="rounded-[2.5rem] border border-white/50 bg-white/45 p-8 shadow-[0_20px_60px_-15px_rgba(224,112,158,0.4)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-display text-xl font-semibold text-ink">
              {isEditingExisting ? (post?.status === 'PUBLISHED' ? 'Edit post' : 'Edit draft') : 'Write a post'}
            </h1>
            {isEditingExisting && post?.status === 'PUBLISHED' && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => unpublish()}
                className="shrink-0 rounded-full border border-white/60 bg-white/70 px-4 py-1.5 font-body text-xs font-semibold text-ink/60 hover:bg-white disabled:opacity-60"
              >
                Move to drafts
              </button>
            )}
          </div>

          <div className="mt-5">
            <BlogEditor
              communityId={community?.id ?? null}
              title={title}
              coverImageUrl={coverImageUrl}
              body={body}
              onTitleChange={setTitle}
              onCoverImageUrlChange={setCoverImageUrl}
              onBodyChange={setBody}
            />
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              disabled={isSaving || !title.trim() || !body.trim()}
              onClick={handleSaveDraft}
              className="flex-1 rounded-full border border-white/60 bg-white/70 px-6 py-2.5 font-body text-sm font-semibold text-ink/70 transition-colors hover:bg-white disabled:opacity-60"
            >
              {isSaving ? 'Saving…' : 'Save draft'}
            </button>
            <button
              type="button"
              disabled={isSaving || !title.trim() || !body.trim()}
              onClick={handlePublish}
              className="flex-1 rounded-full bg-taro px-6 py-2.5 font-body text-sm font-semibold text-white shadow-lg shadow-taro/30 transition-colors hover:bg-taro-dark disabled:opacity-60"
            >
              {isSaving ? 'Publishing…' : 'Publish'}
            </button>
          </div>
        </div>
      </FadeInSection>

      <div className="fixed inset-x-0 top-4 z-40 flex justify-center px-4">
        <Toast
          message={error}
          tone="error"
          onDismiss={isEditingExisting ? dismissEditError : dismissCreateError}
        />
      </div>
    </div>
  )
}

export default BlogComposerPage
