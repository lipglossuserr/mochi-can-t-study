import type { RewardSourceRef } from '@/features/pet/utils/rewardPipeline'

/**
 * Sprint 7.1B — pure task-completion orchestration, deliberately kept
 * free of any React import.
 *
 * Split out from useTaskCompletion.ts (which imports `usePet`, and
 * therefore transitively `PetContext.tsx` — a `.tsx` file) specifically
 * so this logic can be unit-tested the same way every other pure module
 * in this codebase already is (rewardPipeline.ts, xp.ts): no React
 * import anywhere in the chain, so nothing here needs a DOM/JSX-capable
 * test environment, matching every existing test in `src/__tests__/`.
 */

export interface TaskCompletionDeps {
  completeTask: (id: number) => Promise<unknown>
  celebrateReward: (ref: RewardSourceRef) => Promise<void>
}

export type TaskCompletionResult = { ok: true } | { ok: false; error: unknown }

/**
 * Complete the task server-side, then trigger the shared reward
 * pipeline for it. Never computes XP/coins itself — `celebrateReward`
 * (rewardPipeline.ts) is the only thing that reads pet stats, and it
 * only ever reads them from a fresh `GET /pet`.
 */
export async function runTaskCompletion(
  taskId: number,
  deps: TaskCompletionDeps,
): Promise<TaskCompletionResult> {
  try {
    await deps.completeTask(taskId)
  } catch (error) {
    return { ok: false, error }
  }
  // A failure here (e.g. the refresh-pet fetch inside celebrateReward)
  // is a display-only problem — the task itself already completed
  // server-side, so this doesn't get folded into the same error path.
  await deps.celebrateReward({ type: 'task', id: taskId })
  return { ok: true }
}
