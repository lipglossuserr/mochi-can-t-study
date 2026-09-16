import { useState, type FormEvent } from 'react'
import { useBlogComments } from '@/features/community'
import { groupCommentsByThread } from '@/features/community/utils/groupCommentsByThread'
import CommentRow from './CommentRow'

interface BlogCommentThreadProps {
  slug: string
  blogId: number
  currentUid: string | null
  canModerate: boolean
}

/**
 * The comment thread for one blog post — same shape and styling as
 * `CommentThread` (the short-post version), just backed by
 * `useBlogComments` instead of `useComments`. v2 backlog: threaded
 * (one level deep) — see `CommentThread`'s javadoc for the shared
 * grouping/reply-input approach; this mirrors it exactly.
 */
function BlogCommentThread({ slug, blogId, currentUid, canModerate }: BlogCommentThreadProps) {
  const { comments, loading, error, create, remove, toggleUpvote, actionPendingId, actionError } = useBlogComments(
    slug,
    blogId,
  )
  const [draft, setDraft] = useState('')
  const [replyingToId, setReplyingToId] = useState<number | null>(null)
  const [replyDraft, setReplyDraft] = useState('')

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed) return
    const created = await create({ body: trimmed })
    if (created) setDraft('')
  }

  const handleReplySubmit = async (event: FormEvent, parentCommentId: number) => {
    event.preventDefault()
    const trimmed = replyDraft.trim()
    if (!trimmed) return
    const created = await create({ body: trimmed, parentCommentId })
    if (created) {
      setReplyDraft('')
      setReplyingToId(null)
    }
  }

  const threads = groupCommentsByThread(comments)

  return (
    <div className="mt-1 flex flex-col gap-3 border-t border-white/40 pt-3">
      {loading && <p className="font-body text-xs text-ink/40">Loading comments…</p>}
      {!loading && error && <p className="font-body text-xs text-berry">{error}</p>}
      {actionError && <p className="font-body text-xs text-berry">{actionError}</p>}

      {!loading &&
        threads.map(({ comment, replies }) => (
          <div key={comment.id} className="flex flex-col gap-2">
            <CommentRow
              comment={comment}
              slug={slug}
              currentUid={currentUid}
              canModerate={canModerate}
              actionPending={actionPendingId === comment.id}
              isReply={false}
              onToggleUpvote={() => toggleUpvote(comment.id)}
              onDelete={() => remove(comment.id)}
              onReply={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
            />

            {replies.map((reply) => (
              <CommentRow
                key={reply.id}
                comment={reply}
                slug={slug}
                currentUid={currentUid}
                canModerate={canModerate}
                actionPending={actionPendingId === reply.id}
                isReply
                onToggleUpvote={() => toggleUpvote(reply.id)}
                onDelete={() => remove(reply.id)}
              />
            ))}

            {replyingToId === comment.id && (
              <form onSubmit={(event) => handleReplySubmit(event, comment.id)} className="ml-6 flex items-center gap-2">
                <input
                  type="text"
                  autoFocus
                  value={replyDraft}
                  onChange={(event) => setReplyDraft(event.target.value)}
                  placeholder={`Reply to ${comment.authorUid}…`}
                  maxLength={1000}
                  className="w-full rounded-full border border-white/60 bg-white/70 px-4 py-1.5 font-body text-xs text-ink outline-none focus:border-taro"
                />
                <button
                  type="submit"
                  disabled={actionPendingId === 'create' || !replyDraft.trim()}
                  className="shrink-0 rounded-full bg-taro px-3 py-1.5 font-body text-xs font-semibold text-white disabled:opacity-50"
                >
                  Reply
                </button>
              </form>
            )}
          </div>
        ))}

      {!loading && comments.length === 0 && (
        <p className="font-body text-xs text-ink/40">No comments yet — say something kind ♡</p>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a comment…"
          maxLength={1000}
          className="w-full rounded-full border border-white/60 bg-white/70 px-4 py-2 font-body text-sm text-ink outline-none focus:border-taro"
        />
        <button
          type="submit"
          disabled={actionPendingId === 'create' || !draft.trim()}
          className="shrink-0 rounded-full bg-taro px-4 py-2 font-body text-xs font-semibold text-white disabled:opacity-50"
        >
          Post
        </button>
      </form>
    </div>
  )
}

export default BlogCommentThread
