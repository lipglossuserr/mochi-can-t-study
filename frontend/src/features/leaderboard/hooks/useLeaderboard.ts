import { useCallback, useEffect, useState } from 'react'
import { friendlyMessage } from '@/features/pet/utils/apiErrors'
import { fetchLeaderboard } from '../api/leaderboardService'
import type { LeaderboardResponse } from '../types/leaderboard'

/**
 * Fetches the leaderboard once on mount. Same fetch/loading/error/reload
 * shape as `useTasks` and `usePet` — the one consistent pattern every
 * list-reading hook in this codebase follows.
 */
export function useLeaderboard() {
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchLeaderboard()
      setData(response.data.data)
    } catch (err) {
      setError(friendlyMessage(err, "Couldn't load the leaderboard right now."))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, reload: load }
}
