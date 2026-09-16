import type { Comment } from '../types/post'

/**
 * Groups a flat comment list (the shape the backend returns — see
 * `CommentService`'s javadoc for why threading stays flat server-side)
 * into top-level comments each paired with their replies, in creation
 * order on both levels. Shared by `CommentThread` and
 * `BlogCommentThread` rather than duplicated — the grouping logic is
 * identical for both; only the API calls underneath differ.
 * <p>
 * A comment whose `parentCommentId` doesn't match any comment in the
 * list (e.g. the parent was deleted, though in practice deleting a
 * parent cascades its replies away too — see the `V24` migration's
 * header comment) is treated as top-level rather than dropped, so
 * nothing silently disappears from the thread.
 */
export interface ThreadedComment {
  comment: Comment
  replies: Comment[]
}

export function groupCommentsByThread(comments: Comment[]): ThreadedComment[] {
  const byId = new Map(comments.map((c) => [c.id, c]))
  const topLevel: Comment[] = []
  const repliesByParent = new Map<number, Comment[]>()

  for (const comment of comments) {
    const parentId = comment.parentCommentId
    if (parentId !== null && byId.has(parentId)) {
      const existing = repliesByParent.get(parentId)
      if (existing) {
        existing.push(comment)
      } else {
        repliesByParent.set(parentId, [comment])
      }
    } else {
      topLevel.push(comment)
    }
  }

  return topLevel.map((comment) => ({
    comment,
    replies: repliesByParent.get(comment.id) ?? [],
  }))
}
