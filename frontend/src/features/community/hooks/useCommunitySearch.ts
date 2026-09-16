import { useEffect, useState } from 'react'
import { friendlyMessage } from '@/features/pet/utils/apiErrors'
import { searchCommunity } from '../api/searchService'
import type { SearchResult } from '../types/search'

const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2

/**
 * Debounced full-text search within one community — Community Rooms,
 * v2 backlog. Self-debounces on the raw `query` the caller passes in
 * (300ms), rather than expecting the caller to debounce first — a
 * search box's own input handler shouldn't have to know about timing.
 * A query under 2 characters clears results without calling the API,
 * matching the backend's own short-circuit (see `SearchService`'s
 * javadoc) so there's no flash of a "no results" state while typing
 * the first letter.
 */
export function useCommunitySearch(slug: string, query: string) {
  const [results, setResults] = useState<{ posts: SearchResult[]; blogPosts: SearchResult[] }>({
    posts: [],
    blogPosts: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults({ posts: [], blogPosts: [] })
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    const timeout = setTimeout(async () => {
      try {
        const response = await searchCommunity(slug, trimmed)
        if (!cancelled) {
          setResults(response.data.data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(friendlyMessage(err, "Couldn't search right now."))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [slug, query])

  return { results, loading, error }
}
