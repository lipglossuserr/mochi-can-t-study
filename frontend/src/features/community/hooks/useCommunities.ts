import { useCallback, useEffect, useState } from 'react'
import { friendlyMessage } from '@/features/pet/utils/apiErrors'
import { createCommunity, fetchCommunities } from '../api/communityService'
import type { Community, CreateCommunityRequest } from '../types/community'

/**
 * The discover feed — every PUBLIC community plus any PRIVATE one the
 * caller has a relationship with — with an optional debounced-by-caller
 * `search` term. Same load-on-mount/reload shape as `useTasks`.
 */
export function useCommunities(search?: string) {
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchCommunities(search)
      setCommunities(response.data.data)
    } catch (err) {
      setError(friendlyMessage(err, "Couldn't load communities right now."))
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    load()
  }, [load])

  return { communities, loading, error, reload: load }
}

/**
 * The create-community mutation, split out from `useCommunities` the
 * same way `useTaskMutations` is split from `useTasks` — creating is a
 * one-shot action with its own submitting/error state, not part of the
 * list's own load lifecycle.
 */
export function useCreateCommunity() {
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (payload: CreateCommunityRequest): Promise<Community | null> => {
    setCreating(true)
    setError(null)
    try {
      const response = await createCommunity(payload)
      return response.data.data
    } catch (err) {
      setError(friendlyMessage(err, "Couldn't create that community right now."))
      return null
    } finally {
      setCreating(false)
    }
  }, [])

  return { create, creating, error, dismissError: () => setError(null) }
}
