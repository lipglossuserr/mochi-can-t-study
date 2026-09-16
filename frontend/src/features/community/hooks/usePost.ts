import { useCallback, useEffect, useState } from 'react'
import { friendlyMessage } from '@/features/pet/utils/apiErrors'
import {
  fetchPost,
  togglePostPin,
  togglePostResolved,
  togglePostUpvote,
  votePost,
} from '../api/postService'
import type { Post } from '../types/post'

/**
 * One post's full detail view — the standalone reader page
 * (`PostDetailPage`) uses this rather than `usePosts`, the same way
 * `useBlogPost` is separate from `useBlogPosts`: a single-post fetch
 * is its own lifecycle (load once, patch in place on mutation) and
 * doesn't need to carry a whole feed's list-management logic along
 * with it. Deliberately does not include edit/delete/create — those
 * stay on `usePosts` since they're feed-level operations (the edit
 * modal is opened from `PostCard` in the feed context; there's no
 * separate composer route for posts the way there is for blog posts).
 */
export function usePost(slug: string, postId: number | null) {
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (postId === null) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await fetchPost(slug, postId)
      setPost(response.data.data)
    } catch (err) {
      setError(friendlyMessage(err, "Couldn't load that post right now."))
    } finally {
      setLoading(false)
    }
  }, [slug, postId])

  useEffect(() => {
    load()
  }, [load])

  const togglePin = useCallback(async () => {
    if (postId === null) return
    setActionError(null)
    try {
      const response = await togglePostPin(slug, postId)
      setPost(response.data.data)
    } catch (err) {
      setActionError(friendlyMessage(err, "Couldn't pin that post right now."))
    }
  }, [slug, postId])

  const toggleResolved = useCallback(async () => {
    if (postId === null) return
    setActionError(null)
    try {
      const response = await togglePostResolved(slug, postId)
      setPost(response.data.data)
    } catch (err) {
      setActionError(friendlyMessage(err, "Couldn't update that post right now."))
    }
  }, [slug, postId])

  const vote = useCallback(
    async (optionId: number) => {
      if (postId === null) return
      setActionError(null)
      try {
        const response = await votePost(slug, postId, optionId)
        setPost(response.data.data)
      } catch (err) {
        setActionError(friendlyMessage(err, "Couldn't record that vote right now."))
      }
    },
    [slug, postId],
  )

  const toggleUpvote = useCallback(async () => {
    if (postId === null) return
    setActionError(null)
    try {
      const response = await togglePostUpvote(slug, postId)
      setPost(response.data.data)
    } catch (err) {
      setActionError(friendlyMessage(err, "Couldn't record that upvote right now."))
    }
  }, [slug, postId])

  return {
    post,
    loading,
    error,
    reload: load,
    togglePin,
    toggleResolved,
    vote,
    toggleUpvote,
    actionError,
    dismissActionError: () => setActionError(null),
  }
}
