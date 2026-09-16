import { useCallback, useEffect, useState } from 'react'
import { friendlyMessage } from '@/features/pet/utils/apiErrors'
import {
  fetchBlogPost,
  publishBlogPost,
  toggleBlogPostUpvote,
  unpublishBlogPost,
  updateBlogPost,
} from '../api/blogService'
import type { BlogPost, UpdateBlogPostRequest } from '../types/blog'

/**
 * One blog post's full detail view — the reader page and the editor
 * page both use this. Separate from `useBlogPosts` (the feed list)
 * since a single-post fetch returns the full `body`, which the feed
 * deliberately omits (see `BlogPostResponse`'s javadoc).
 */
export function useBlogPost(slug: string, blogId: number | null) {
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (blogId === null) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await fetchBlogPost(slug, blogId)
      setPost(response.data.data)
    } catch (err) {
      setError(friendlyMessage(err, "Couldn't load that post right now."))
    } finally {
      setLoading(false)
    }
  }, [slug, blogId])

  useEffect(() => {
    load()
  }, [load])

  const save = useCallback(
    async (payload: UpdateBlogPostRequest) => {
      if (blogId === null) return null
      setSaving(true)
      setActionError(null)
      try {
        const response = await updateBlogPost(slug, blogId, payload)
        setPost(response.data.data)
        return response.data.data
      } catch (err) {
        setActionError(friendlyMessage(err, "Couldn't save your changes right now."))
        return null
      } finally {
        setSaving(false)
      }
    },
    [slug, blogId],
  )

  const publish = useCallback(async () => {
    if (blogId === null) return null
    setSaving(true)
    setActionError(null)
    try {
      const response = await publishBlogPost(slug, blogId)
      setPost(response.data.data)
      return response.data.data
    } catch (err) {
      setActionError(friendlyMessage(err, "Couldn't publish that post right now."))
      return null
    } finally {
      setSaving(false)
    }
  }, [slug, blogId])

  const unpublish = useCallback(async () => {
    if (blogId === null) return
    setSaving(true)
    setActionError(null)
    try {
      const response = await unpublishBlogPost(slug, blogId)
      setPost(response.data.data)
    } catch (err) {
      setActionError(friendlyMessage(err, "Couldn't move that post back to drafts right now."))
    } finally {
      setSaving(false)
    }
  }, [slug, blogId])

  const toggleUpvote = useCallback(async () => {
    if (blogId === null) return
    try {
      const response = await toggleBlogPostUpvote(slug, blogId)
      setPost(response.data.data)
    } catch (err) {
      setActionError(friendlyMessage(err, "Couldn't record that upvote right now."))
    }
  }, [slug, blogId])

  return {
    post,
    loading,
    error,
    reload: load,
    save,
    saving,
    publish,
    unpublish,
    toggleUpvote,
    actionError,
    dismissActionError: () => setActionError(null),
  }
}
