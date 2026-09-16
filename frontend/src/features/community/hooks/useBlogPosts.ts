import { useCallback, useEffect, useState } from 'react'
import { friendlyMessage } from '@/features/pet/utils/apiErrors'
import {
  createBlogPost,
  deleteBlogPost,
  fetchBlogPosts,
  fetchMyBlogPosts,
  publishBlogPost,
  toggleBlogPostUpvote,
  unpublishBlogPost,
} from '../api/blogService'
import type { BlogPost, CreateBlogPostRequest } from '../types/blog'

/**
 * One community's blog feed plus every list-level mutation — same
 * shape as `usePosts`: the list and the mutations share state, since
 * publishing/upvoting a post changes something the feed is already
 * rendering. `scope` picks which list this hook loads: `"published"`
 * for the public feed, `"mine"` for the caller's own drafts +
 * published posts (the "My drafts" view).
 */
export function useBlogPosts(slug: string, scope: 'published' | 'mine' = 'published') {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionPendingId, setActionPendingId] = useState<number | 'create' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = scope === 'mine' ? await fetchMyBlogPosts(slug) : await fetchBlogPosts(slug)
      setPosts(response.data.data)
    } catch (err) {
      setError(friendlyMessage(err, "Couldn't load blog posts right now."))
    } finally {
      setLoading(false)
    }
  }, [slug, scope])

  useEffect(() => {
    load()
  }, [load])

  const replace = (updated: BlogPost) => setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))

  const create = useCallback(
    async (payload: CreateBlogPostRequest): Promise<BlogPost | null> => {
      setActionPendingId('create')
      setActionError(null)
      try {
        const response = await createBlogPost(slug, payload)
        setPosts((prev) => [response.data.data, ...prev])
        return response.data.data
      } catch (err) {
        setActionError(friendlyMessage(err, "Couldn't save that draft right now."))
        return null
      } finally {
        setActionPendingId(null)
      }
    },
    [slug],
  )

  const remove = useCallback(
    async (blogId: number) => {
      setActionPendingId(blogId)
      setActionError(null)
      try {
        await deleteBlogPost(slug, blogId)
        setPosts((prev) => prev.filter((p) => p.id !== blogId))
      } catch (err) {
        setActionError(friendlyMessage(err, "Couldn't remove that post right now."))
      } finally {
        setActionPendingId(null)
      }
    },
    [slug],
  )

  const publish = useCallback(
    async (blogId: number) => {
      setActionPendingId(blogId)
      setActionError(null)
      try {
        const response = await publishBlogPost(slug, blogId)
        replace(response.data.data)
        return response.data.data
      } catch (err) {
        setActionError(friendlyMessage(err, "Couldn't publish that post right now."))
        return null
      } finally {
        setActionPendingId(null)
      }
    },
    [slug],
  )

  const unpublish = useCallback(
    async (blogId: number) => {
      setActionPendingId(blogId)
      setActionError(null)
      try {
        const response = await unpublishBlogPost(slug, blogId)
        replace(response.data.data)
      } catch (err) {
        setActionError(friendlyMessage(err, "Couldn't move that post back to drafts right now."))
      } finally {
        setActionPendingId(null)
      }
    },
    [slug],
  )

  const toggleUpvote = useCallback(
    async (blogId: number) => {
      setActionPendingId(blogId)
      setActionError(null)
      try {
        const response = await toggleBlogPostUpvote(slug, blogId)
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
    remove,
    publish,
    unpublish,
    toggleUpvote,
    actionPendingId,
    actionError,
    dismissActionError: () => setActionError(null),
  }
}
