import { useCallback, useEffect, useState } from 'react'
import { friendlyMessage } from '@/features/pet/utils/apiErrors'
import { fetchCommunity, joinCommunity, leaveCommunity, updateCommunity } from '../api/communityService'
import type { Community, UpdateCommunityRequest } from '../types/community'

/**
 * One community's detail — the header data plus the join/leave
 * mutations, since both need to agree on the same `community` state
 * (joining/leaving changes `callerStatus`/`memberCount`, which the
 * header re-renders from immediately rather than waiting on a reload
 * round-trip).
 */
export function useCommunity(slug: string) {
  const [community, setCommunity] = useState<Community | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionPending, setActionPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchCommunity(slug)
      setCommunity(response.data.data)
    } catch (err) {
      setError(friendlyMessage(err, "Couldn't load this community right now."))
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    load()
  }, [load])

  const join = useCallback(async () => {
    setActionPending(true)
    setActionError(null)
    try {
      await joinCommunity(slug)
      await load()
    } catch (err) {
      setActionError(friendlyMessage(err, "Couldn't send that join request right now."))
    } finally {
      setActionPending(false)
    }
  }, [slug, load])

  const leave = useCallback(async () => {
    setActionPending(true)
    setActionError(null)
    try {
      await leaveCommunity(slug)
      await load()
    } catch (err) {
      setActionError(friendlyMessage(err, "Couldn't leave this community right now."))
    } finally {
      setActionPending(false)
    }
  }, [slug, load])

  /** Admin-only on the backend; a non-admin caller gets a 403 surfaced through `actionError`. v2 backlog. */
  const update = useCallback(
    async (payload: UpdateCommunityRequest) => {
      setActionPending(true)
      setActionError(null)
      try {
        const response = await updateCommunity(slug, payload)
        setCommunity(response.data.data)
        return true
      } catch (err) {
        setActionError(friendlyMessage(err, "Couldn't save those changes right now."))
        return false
      } finally {
        setActionPending(false)
      }
    },
    [slug],
  )

  return {
    community,
    loading,
    error,
    reload: load,
    join,
    leave,
    update,
    actionPending,
    actionError,
    dismissActionError: () => setActionError(null),
  }
}
