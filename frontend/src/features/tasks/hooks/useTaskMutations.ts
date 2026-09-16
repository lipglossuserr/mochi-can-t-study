import { useCallback, useState } from 'react'
import { friendlyMessage } from '@/features/pet/utils/apiErrors'
import { createTask, deleteTask, reopenTask, updateTask } from '../api/taskService'
import type { Task, TaskWriteRequest } from '../types/task'

/**
 * useTaskMutations — Sprint 7.3A.
 *
 * The write-side sibling of `useTasks` (read) and `useTaskCompletion`
 * (complete-and-celebrate): create/update/delete/reopen for the new
 * Tasks page. Kept separate from `useTaskCompletion` on purpose —
 * completing a task hands off to the shared reward pipeline
 * (`celebrateReward`), and none of these four actions do; folding them
 * into the same hook would mix an unrelated concern into a component
 * (`useTaskCompletion` imports `usePet`) three of these four callers
 * don't need.
 *
 * Same convention as every other mutation hook in this codebase
 * (`useTaskCompletion`, the pet Feed/Play actions in `PetContext`):
 * per-action pending state so a list can disable/label just the one
 * row being acted on, `friendlyMessage` for error text, and the caller
 * decides what happens on success (here: reload the list) rather than
 * this hook owning any list state itself.
 */
export function useTaskMutations() {
  const [creating, setCreating] = useState(false)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [reopeningId, setReopeningId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (payload: TaskWriteRequest): Promise<Task | null> => {
    setCreating(true)
    setError(null)
    try {
      const response = await createTask(payload)
      return response.data.data
    } catch (err) {
      setError(friendlyMessage(err, "Couldn't create that task — please try again."))
      return null
    } finally {
      setCreating(false)
    }
  }, [])

  const save = useCallback(async (id: number, payload: TaskWriteRequest): Promise<Task | null> => {
    setSavingId(id)
    setError(null)
    try {
      const response = await updateTask(id, payload)
      return response.data.data
    } catch (err) {
      setError(friendlyMessage(err, "Couldn't save your changes — please try again."))
      return null
    } finally {
      setSavingId(null)
    }
  }, [])

  const remove = useCallback(async (id: number): Promise<boolean> => {
    setDeletingId(id)
    setError(null)
    try {
      await deleteTask(id)
      return true
    } catch (err) {
      setError(friendlyMessage(err, "Couldn't delete that task — please try again."))
      return false
    } finally {
      setDeletingId(null)
    }
  }, [])

  const reopen = useCallback(async (id: number): Promise<boolean> => {
    setReopeningId(id)
    setError(null)
    try {
      await reopenTask(id)
      return true
    } catch (err) {
      setError(friendlyMessage(err, "Couldn't reopen that task — please try again."))
      return false
    } finally {
      setReopeningId(null)
    }
  }, [])

  return {
    create,
    save,
    remove,
    reopen,
    creating,
    /** The task id currently being saved (edit), or null. */
    savingId,
    /** The task id currently being deleted, or null. */
    deletingId,
    /** The task id currently being reopened, or null. */
    reopeningId,
    error,
    dismissError: () => setError(null),
  }
}
