import { useCallback, useEffect, useState } from 'react'
import { friendlyMessage } from '@/features/pet/utils/apiErrors'
import { fetchDailyGoals } from '../api/dailyGoalService'
import type { DailyGoal } from '../types/dailyGoal'

/**
 * Today's goals — fetch-on-mount with `loading`/`error`/`reload`, the
 * same shape every list hook in this codebase already uses
 * (`useTasks`, `useTaskCompletion`'s sibling `useTaskMutations`). Not a
 * context: like tasks, goals are only ever read from one screen so far.
 *
 * No client-side date filtering here — "today's goals" is exactly what
 * `GET /api/daily-goals` already scopes to server-side (see this
 * sprint's "already handled by backend" note), so this hook just
 * displays whatever comes back.
 */
export function useDailyGoals() {
  const [goals, setGoals] = useState<DailyGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchDailyGoals()
      setGoals(response.data.data)
    } catch (err) {
      setError(friendlyMessage(err, "Couldn't load today's goals right now."))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { goals, loading, error, reload: load }
}
