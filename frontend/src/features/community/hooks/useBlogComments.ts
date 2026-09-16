import { useCallback, useEffect, useState } from 'react'
import { friendlyMessage } from '@/features/pet/utils/apiErrors'
import {
  createBlogComment,
  deleteBlogComment,
  fetchBlogComments,
  toggleBlogCommentUpvote,
} from '../api/blogService'
import type { Comment, CreateCommentRequest } from '../types/post'

/** One blog post's comment thread — same shape as `useComments` (the short-post version), targeting the blog comment endpoints instead. */
export function useBlogComments(slug: string, blogId: number) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionPendingId, setActionPendingId] = useState<number | 'create' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchBlogComments(slug, blogId)
      setComments(response.data.data)
    } catch (err) {
      setError(friendlyMessage(err, "Couldn't load comments right now."))
    } finally {
      setLoading(false)
    }
  }, [slug, blogId])

  useEffect(() => {
    load()
  }, [load])

  const replace = (updated: Comment) => setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))

  const create = useCallback(
    async (payload: CreateCommentRequest) => {
      setActionPendingId('create')
      setActionError(null)
      try {
        const response = await createBlogComment(slug, blogId, payload)
        setComments((prev) => [...prev, response.data.data])
        return response.data.data
      } catch (err) {
        setActionError(friendlyMessage(err, "Couldn't add that comment right now."))
        return null
      } finally {
        setActionPendingId(null)
      }
    },
    [slug, blogId],
  )

  const remove = useCallback(
    async (commentId: number) => {
      setActionPendingId(commentId)
      setActionError(null)
      try {
        await deleteBlogComment(slug, blogId, commentId)
        setComments((prev) => prev.filter((c) => c.id !== commentId))
      } catch (err) {
        setActionError(friendlyMessage(err, "Couldn't remove that comment right now."))
      } finally {
        setActionPendingId(null)
      }
    },
    [slug, blogId],
  )

  const toggleUpvote = useCallback(
    async (commentId: number) => {
      setActionPendingId(commentId)
      setActionError(null)
      try {
        const response = await toggleBlogCommentUpvote(slug, blogId, commentId)
        replace(response.data.data)
      } catch (err) {
        setActionError(friendlyMessage(err, "Couldn't record that upvote right now."))
      } finally {
        setActionPendingId(null)
      }
    },
    [slug, blogId],
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
