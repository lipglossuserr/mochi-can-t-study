import { useCallback, useEffect, useState } from 'react'
import { friendlyMessage } from '@/features/pet/utils/apiErrors'
import { createComment, deleteComment, fetchComments, toggleCommentUpvote } from '../api/postService'
import type { Comment, CreateCommentRequest } from '../types/post'

/**
 * One post's comment thread — same shape as `usePosts`: list + every
 * mutation share state, since upvoting a comment patches a comment
 * the thread is already rendering.
 */
export function useComments(slug: string, postId: number) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionPendingId, setActionPendingId] = useState<number | 'create' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchComments(slug, postId)
      setComments(response.data.data)
    } catch (err) {
      setError(friendlyMessage(err, "Couldn't load comments right now."))
    } finally {
      setLoading(false)
    }
  }, [slug, postId])

  useEffect(() => {
    load()
  }, [load])

  const replace = (updated: Comment) => setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))

  const create = useCallback(
    async (payload: CreateCommentRequest) => {
      setActionPendingId('create')
      setActionError(null)
      try {
        const response = await createComment(slug, postId, payload)
        setComments((prev) => [...prev, response.data.data])
        return response.data.data
      } catch (err) {
        setActionError(friendlyMessage(err, "Couldn't add that comment right now."))
        return null
      } finally {
        setActionPendingId(null)
      }
    },
    [slug, postId],
  )

  const remove = useCallback(
    async (commentId: number) => {
      setActionPendingId(commentId)
      setActionError(null)
      try {
        await deleteComment(slug, postId, commentId)
        setComments((prev) => prev.filter((c) => c.id !== commentId))
      } catch (err) {
        setActionError(friendlyMessage(err, "Couldn't remove that comment right now."))
      } finally {
        setActionPendingId(null)
      }
    },
    [slug, postId],
  )

  const toggleUpvote = useCallback(
    async (commentId: number) => {
      setActionPendingId(commentId)
      setActionError(null)
      try {
        const response = await toggleCommentUpvote(slug, postId, commentId)
        replace(response.data.data)
      } catch (err) {
        setActionError(friendlyMessage(err, "Couldn't record that upvote right now."))
      } finally {
        setActionPendingId(null)
      }
    },
    [slug, postId],
  )

  return {
    comments,
    loading,
    error,
    reload: load,
    create,
    remove,
    toggleUpvote,
    actionPendingId,
    actionError,
    dismissActionError: () => setActionError(null),
  }
}
