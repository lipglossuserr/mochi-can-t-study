import { useState, type FormEvent } from 'react'
import { useComments } from '@/features/community'
import { groupCommentsByThread } from '@/features/community/utils/groupCommentsByThread'
import CommentRow from './CommentRow'

interface CommentThreadProps {
  slug: string
  postId: number
  currentUid: string | null
  canModerate: boolean
}

/**
 * The comment thread for one post, mounted inline under `PostCard` when
 * expanded. Owns its own `useComments` instance rather than the parent
 * feed owning every post's comments up front — comment threads are
 * read on demand, not preloaded with the feed, so this keeps the
 * initial feed request light.
 * <p>
 * v2 backlog: threaded (one level deep) — `groupCommentsByThread`
 * pairs each top-level comment with its replies; `replyingToId` tracks
 * which comment (if any) the visible reply input targets, and is
 * cleared on submit/cancel. There's no "reply to a reply" — see
 * `CommentRow`'s javadoc for why the Reply button only appears on
 * top-level rows.
 */
function CommentThread({ slug, postId, currentUid, canModerate }: CommentThreadProps) {
  const { comments, loading, error, create, remove, toggleUpvote, actionPendingId, actionError } = useComments(
    slug,
    postId,
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

export default CommentThread
