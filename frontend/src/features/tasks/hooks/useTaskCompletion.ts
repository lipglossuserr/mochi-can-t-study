import { useCallback, useState } from 'react'
import { usePet } from '@/features/pet/hooks/usePet'
import { friendlyMessage } from '@/features/pet/utils/apiErrors'
import { completeTask } from '../api/taskService'
import { runTaskCompletion } from '../runTaskCompletion'

/**
 * useTaskCompletion — Sprint 7.1B.
 *
 * Thin React wrapper around `runTaskCompletion` (kept in its own
 * React-free module — see that file's doc comment for why). This is
 * THE task-rewards integration this sprint asks for: when a task is
 * completed, call the (currently speculative — see taskService.ts)
 * completion endpoint, then hand off to the exact same reward pipeline
 * Study Room rewards already use — `usePet().celebrateReward({ type:
 * 'task', id })`. No new celebration UI, no new XP/coin math, no new
 * Mochi reaction: `celebrateReward` already refreshes the pet from the
 * server, diffs it, dedupes against a repeat call for the same task,
 * shows the exact same `RewardCelebration`/`XPBar`/`AnimatedNumber`/
 * `RewardPanel` stack, and calls `character.celebrate()` — all of that
 * is Sprint 7.1A's pipeline, completely unmodified, reused as-is.
 */
export function useTaskCompletion() {
  const { celebrateReward } = usePet()
  const [completingId, setCompletingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const completeTaskAndCelebrate = useCallback(
    async (taskId: number): Promise<boolean> => {
      setCompletingId(taskId)
      setError(null)
      const result = await runTaskCompletion(taskId, {
        completeTask: (id) => completeTask(id),
        celebrateReward,
      })
      if (!result.ok) {
        setError(friendlyMessage(result.error, "Couldn't complete that task — please try again."))
      }
      setCompletingId(null)
      return result.ok
    },
    [celebrateReward],
  )

  return {
    completeTaskAndCelebrate,
    /** The task id currently completing, or null — lets a list disable just that one row's button. */
    completingId,
    error,
    dismissError: () => setError(null),
  }
}
