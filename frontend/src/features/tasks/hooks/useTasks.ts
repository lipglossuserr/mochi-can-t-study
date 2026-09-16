import { useCallback, useEffect, useState } from 'react'
import { friendlyMessage } from '@/features/pet/utils/apiErrors'
import { fetchTasks } from '../api/taskService'
import type { Task, TaskStatus } from '../types/task'

/**
 * The user's tasks for a given status — originally written only for
 * the Study Room's PENDING-only task picker (Sprint 7.2C), generalized
 * in Sprint 7.3A to take an explicit `status` so the new Tasks page's
 * Pending/Completed filter can reuse this exact hook instead of a
 * second copy of the same fetch-on-mount/reload logic. Defaults to
 * `'PENDING'` so the existing `useTasks()` call in StudyRoomPage keeps
 * behaving exactly as before, unchanged.
 *
 * Refetches whenever `status` changes — the Tasks page just flips a
 * `TaskStatus` state value on tab click and this hook does the rest,
 * same shape as every other list/loading/error hook in this codebase
 * (see `useTaskCompletion`'s companion `runTaskCompletion` for the
 * sibling mutation-side hook).
 *
 * Deliberately not a context like `usePet`/`PetContext` — every reader
 * (Study Room picker, Tasks page) wants its own status filter and its
 * own reload timing, so a single shared store would fight both
 * callers rather than serve them.
 */
export function useTasks(status: TaskStatus = 'PENDING') {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchTasks(status)
      setTasks(response.data.data)
    } catch (err) {
      setError(friendlyMessage(err, "Couldn't load your tasks right now."))
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    load()
  }, [load])

  return { tasks, loading, error, reload: load }
}
