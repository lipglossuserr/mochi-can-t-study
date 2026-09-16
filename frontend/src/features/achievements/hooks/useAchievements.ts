import { useCallback, useEffect, useState } from 'react'
import { friendlyMessage } from '@/features/pet/utils/apiErrors'
import { fetchAchievements } from '../api/achievementService'
import type { Achievement } from '../types/achievement'

/**
 * Fetches the achievement catalog (with this user's unlock state) once
 * on mount. Same fetch/loading/error/reload shape as `useTasks` and
 * `useLeaderboard`.
 */
export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchAchievements()
      setAchievements(response.data.data)
    } catch (err) {
      setError(friendlyMessage(err, "Couldn't load achievements right now."))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { achievements, loading, error, reload: load }
}
