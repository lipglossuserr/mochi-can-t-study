import { useCallback, useState } from 'react'
import { friendlyMessage } from '@/features/pet/utils/apiErrors'
import { createDailyGoal, deleteDailyGoal, updateDailyGoal } from '../api/dailyGoalService'
import type { DailyGoal, DailyGoalWriteRequest } from '../types/dailyGoal'

/**
 * useDailyGoalMutations — the write-side sibling of `useDailyGoals`,
 * same convention as `useTaskMutations`: create/update/delete, one
 * pending-id per action so a card can disable/label just the one it's
 * acting on, `friendlyMessage` for error text, caller decides what
 * happens on success (reload the list) rather than this hook owning
 * any list state itself.
 *
 * No `complete`/`reopen` here — unlike `useTaskMutations`, a goal's
 * completion is never a direct mutation this frontend triggers; it's a
 * side effect of `currentValue` reaching `targetValue` server-side.
 */
export function useDailyGoalMutations() {
  const [creating, setCreating] = useState(false)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (payload: DailyGoalWriteRequest): Promise<DailyGoal | null> => {
    setCreating(true)
    setError(null)
    try {
      const response = await createDailyGoal(payload)
      return response.data.data
    } catch (err) {
      setError(friendlyMessage(err, "Couldn't create that goal — please try again."))
      return null
    } finally {
      setCreating(false)
    }
  }, [])

  const save = useCallback(
    async (id: number, payload: DailyGoalWriteRequest): Promise<DailyGoal | null> => {
      setSavingId(id)
      setError(null)
      try {
        const response = await updateDailyGoal(id, payload)
        return response.data.data
      } catch (err) {
        setError(friendlyMessage(err, "Couldn't save your changes — please try again."))
        return null
      } finally {
        setSavingId(null)
      }
    },
    [],
  )

  const remove = useCallback(async (id: number): Promise<boolean> => {
    setDeletingId(id)
    setError(null)
    try {
      await deleteDailyGoal(id)
      return true
    } catch (err) {
      setError(friendlyMessage(err, "Couldn't delete that goal — please try again."))
      return false
    } finally {
      setDeletingId(null)
    }
  }, [])

  return {
    create,
    save,
    remove,
    creating,
    /** The goal id currently being saved (edit), or null. */
    savingId,
    /** The goal id currently being deleted, or null. */
    deletingId,
    error,
    dismissError: () => setError(null),
  }
}
