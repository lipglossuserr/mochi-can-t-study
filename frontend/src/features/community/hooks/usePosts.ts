import { useCallback, useEffect, useState } from 'react'
import { friendlyMessage } from '@/features/pet/utils/apiErrors'
import {
  createPost,
  deletePost,
  fetchPosts,
  togglePostPin,
  togglePostResolved,
  togglePostUpvote,
  updatePost,
  votePost,
} from '../api/postService'
import type { CreatePostRequest, Post, PostSort, PostType, UpdatePostRequest } from '../types/post'

/**
 * One community's post feed plus every post mutation — same shape as
 * `useCommunity`: the list and the mutations share state, since
 * pinning/resolving/voting all change a post the feed is already
 * rendering, and re-fetching the whole feed for a one-post change would
 * be wasteful. Mutations patch the affected post in place; only
 * create/delete touch the list shape itself.
 */
export function usePosts(slug: string, options?: { type?: PostType; sort?: PostSort }) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionPendingId, setActionPendingId] = useState<number | 'create' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchPosts(slug, options)
      setPosts(response.data.data)
    } catch (err) {
      setError(friendlyMessage(err, "Couldn't load posts right now."))
    } finally {
      setLoading(false)
    }
  }, [slug, options?.type, options?.sort])

  useEffect(() => {
    load()
  }, [load])

  const replace = (updated: Post) => setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))

  const create = useCallback(
    async (payload: CreatePostRequest): Promise<Post | null> => {
      setActionPendingId('create')
      setActionError(null)
      try {
        const response = await createPost(slug, payload)
        setPosts((prev) => [response.data.data, ...prev])
        return response.data.data
      } catch (err) {
        setActionError(friendlyMessage(err, "Couldn't create that post right now."))
        return null
      } finally {
        setActionPendingId(null)
      }
    },
    [slug],
  )

  const edit = useCallback(
    async (postId: number, payload: UpdatePostRequest) => {
      setActionPendingId(postId)
      setActionError(null)
      try {
        const response = await updatePost(slug, postId, payload)
        replace(response.data.data)
      } catch (err) {
        setActionError(friendlyMessage(err, "Couldn't save that edit right now."))
      } finally {
        setActionPendingId(null)
      }
    },
    [slug],
  )

  const remove = useCallback(
    async (postId: number) => {
      setActionPendingId(postId)
      setActionError(null)
      try {
        await deletePost(slug, postId)
        setPosts((prev) => prev.filter((p) => p.id !== postId))
      } catch (err) {
        setActionError(friendlyMessage(err, "Couldn't remove that post right now."))
      } finally {
        setActionPendingId(null)
      }
    },
    [slug],
  )

  const togglePin = useCallback(
    async (postId: number) => {
      setActionPendingId(postId)
      setActionError(null)
      try {
        const response = await togglePostPin(slug, postId)
        replace(response.data.data)
      } catch (err) {
        setActionError(friendlyMessage(err, "Couldn't pin that post right now."))
      } finally {
        setActionPendingId(null)
      }
    },
    [slug],
  )

  const toggleResolved = useCallback(
    async (postId: number) => {
      setActionPendingId(postId)
      setActionError(null)
      try {
        const response = await togglePostResolved(slug, postId)
        replace(response.data.data)
      } catch (err) {
        setActionError(friendlyMessage(err, "Couldn't update that post right now."))
      } finally {
        setActionPendingId(null)
      }
    },
    [slug],
  )

  const vote = useCallback(
    async (postId: number, optionId: number) => {
      setActionPendingId(postId)
      setActionError(null)
      try {
        const response = await votePost(slug, postId, optionId)
        replace(response.data.data)
      } catch (err) {
        setActionError(friendlyMessage(err, "Couldn't record that vote right now."))
      } finally {
        setActionPendingId(null)
      }
    },
    [slug],
  )

  const toggleUpvote = useCallback(
    async (postId: number) => {
      setActionPendingId(postId)
      setActionError(null)
      try {
        const response = await togglePostUpvote(slug, postId)
        replace(response.data.data)
      } catch (err) {
        setActionError(friendlyMessage(err, "Couldn't record that upvote right now."))
      } finally {
        setActionPendingId(null)
      }
    },
    [slug],
  )

  return {
    posts,
    loading,
    error,
    reload: load,
    create,
    edit,
    remove,
    togglePin,
    toggleResolved,
    vote,
    toggleUpvote,
    actionPendingId,
    actionError,
    dismissActionError: () => setActionError(null),
  }
}
