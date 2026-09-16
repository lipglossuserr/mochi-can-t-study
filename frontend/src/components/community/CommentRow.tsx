import type { Comment } from '@/features/community'
import ReportButton from './ReportButton'

interface CommentRowProps {
  comment: Comment
  slug: string
  currentUid: string | null
  canModerate: boolean
  actionPending: boolean
  isReply: boolean
  onToggleUpvote: () => void
  onDelete: () => void
  /** Omitted entirely for a reply — replies can't themselves be replied to, see the `V24` migration's header comment. */
  onReply?: () => void
}

/**
 * One comment row, shared by `CommentThread` and `BlogCommentThread` —
 * v2 backlog (threaded comments) pulled this out of both so the
 * grouping/reply-input logic in each thread component isn't tangled up
 * with row markup. `isReply` only controls indentation/styling; the
 * actual one-level-deep rule is enforced by the backend
 * (`CommentService.resolveParent`) and by simply not rendering a Reply
 * button on a reply.
 */
function CommentRow({ comment, currentUid, canModerate, actionPending, isReply, onToggleUpvote, onDelete, onReply, slug }: CommentRowProps) {
  const isAuthor = currentUid !== null && comment.authorUid === currentUid

  return (
    <div className={`flex items-start justify-between gap-2 ${isReply ? 'ml-6 border-l-2 border-white/40 pl-3' : ''}`}>
      <div className="min-w-0">
        <p className="font-body text-xs font-semibold text-ink/60">{shortUid(comment.authorUid)}</p>
        <p className="whitespace-pre-wrap font-body text-sm text-ink/80">{comment.body}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          disabled={actionPending}
          onClick={onToggleUpvote}
          className={`rounded-full px-2 py-1 font-body text-xs ${
            comment.callerUpvoted ? 'bg-taro/20 text-taro-dark' : 'text-ink/40 hover:text-taro-dark'
          }`}
        >
          ▲ {comment.upvoteCount}
        </button>
        {onReply && (
          <button type="button" onClick={onReply} className="font-body text-xs text-ink/40 hover:text-taro-dark">
            Reply
          </button>
        )}
        {(isAuthor || canModerate) && (
          <button
            type="button"
            disabled={actionPending}
            onClick={onDelete}
            className="font-body text-xs text-ink/30 hover:text-berry"
          >
            🗑
          </button>
        )}
        {!isAuthor && <ReportButton slug={slug} targetType="COMMENT" targetId={comment.id} />}
      </div>
    </div>
  )
}

function shortUid(uid: string): string {
  return `Member ${uid.slice(0, 6)}`
}

export default CommentRow
