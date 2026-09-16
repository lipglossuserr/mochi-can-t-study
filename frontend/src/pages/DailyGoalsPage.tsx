import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import FadeInSection from '@/components/FadeInSection'
import Toast from '@/components/Toast'
import { useDailyGoals, useDailyGoalMutations } from '@/features/daily-goals'
import type { DailyGoal, DailyGoalWriteRequest } from '@/features/daily-goals'
import GoalCard from '@/components/daily-goals/GoalCard'
import GoalFormModal from '@/components/daily-goals/GoalFormModal'
import DeleteGoalDialog from '@/components/daily-goals/DeleteGoalDialog'
import DailyGoalsEmptyState from '@/components/daily-goals/DailyGoalsEmptyState'
import DailyGoalsErrorState from '@/components/daily-goals/DailyGoalsErrorState'
import DailyGoalsListSkeleton from '@/components/daily-goals/DailyGoalsListSkeleton'

/**
 * DailyGoalsPage — Sprint 7.4C.
 *
 * The Daily Goals screen: view today's goals, create/edit/delete them.
 * Composed entirely from `features/daily-goals` hooks and
 * `components/daily-goals` presentational pieces — this page owns no
 * fetching or mutation logic itself, only the small bits of local UI
 * state (which modal/dialog is open) that genuinely belong to the page,
 * following the exact same structure as `TasksPage.tsx`.
 *
 * Unlike Tasks, there's no Pending/Completed filter (the sprint brief
 * only asks to "display today's goals") and no complete/reopen action —
 * progress and completion are entirely server-derived, so this page
 * only ever reads and displays them, alongside the create/edit/delete
 * that a person does directly own.
 *
 * No reward celebration, no pet reactions, no achievements — per this
 * sprint's explicit scope, unlike TasksPage's `useTaskCompletion` +
 * `<RewardCelebration/>` pairing.
 */
function DailyGoalsPage() {
  const { goals, loading, error, reload } = useDailyGoals()
  const {
    create,
    save,
    remove,
    creating,
    savingId,
    deletingId,
    error: mutationError,
    dismissError: dismissMutationError,
  } = useDailyGoalMutations()

  const [formState, setFormState] = useState<{ mode: 'create' | 'edit'; goal: DailyGoal | null } | null>(
    null,
  )
  const [deleteTarget, setDeleteTarget] = useState<DailyGoal | null>(null)

  // Same perceived-latency hide-then-reload pattern as TasksPage: a
  // deleted goal disappears immediately rather than waiting on the
  // reload() round trip, which still runs right after as the real
  // source-of-truth sync.
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set())

  const hideThenReload = async (id: number) => {
    setHiddenIds((prev) => new Set(prev).add(id))
    await reload()
    setHiddenIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    const ok = await remove(id)
    setDeleteTarget(null)
    if (ok) await hideThenReload(id)
  }

  const handleCreateSubmit = async (payload: DailyGoalWriteRequest): Promise<boolean> => {
    const created = await create(payload)
    if (!created) return false
    await reload()
    return true
  }

  const handleEditSubmit = async (payload: DailyGoalWriteRequest): Promise<boolean> => {
    if (!formState?.goal) return false
    const saved = await save(formState.goal.id, payload)
    if (!saved) return false
    await reload()
    return true
  }

  const visibleGoals = goals.filter((goal) => !hiddenIds.has(goal.id))
  const modalOpen = Boolean(formState) || Boolean(deleteTarget)

  return (
    <div className="mx-auto w-full max-w-3xl">
      <FadeInSection>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="font-body text-sm text-ink/55">What are you working toward today? ♡</p>
          <button
            type="button"
            onClick={() => setFormState({ mode: 'create', goal: null })}
            className="rounded-full bg-taro px-5 py-2.5 font-body text-sm font-semibold text-white shadow-lg shadow-taro/30 transition-colors hover:bg-taro-dark"
          >
            + New goal
          </button>
        </div>
      </FadeInSection>

      {mutationError && !modalOpen && (
        <div className="mt-4">
          <Toast message={mutationError} onDismiss={dismissMutationError} />
        </div>
      )}

      <FadeInSection delay={0.1} className="mt-6">
        {loading ? (
          <DailyGoalsListSkeleton />
        ) : error ? (
          <DailyGoalsErrorState message={error} onRetry={reload} />
        ) : visibleGoals.length === 0 ? (
          <DailyGoalsEmptyState onCreate={() => setFormState({ mode: 'create', goal: null })} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {visibleGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={(selected) => setFormState({ mode: 'edit', goal: selected })}
                  onDeleteRequest={setDeleteTarget}
                  saving={savingId === goal.id}
                  deleting={deletingId === goal.id}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </FadeInSection>

      {formState && (
        <GoalFormModal
          mode={formState.mode}
          goal={formState.goal}
          submitting={formState.mode === 'create' ? creating : savingId === formState.goal?.id}
          error={mutationError}
          onSubmit={formState.mode === 'create' ? handleCreateSubmit : handleEditSubmit}
          onClose={() => setFormState(null)}
        />
      )}

      {deleteTarget && (
        <DeleteGoalDialog
          goal={deleteTarget}
          deleting={deletingId === deleteTarget.id}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

export default DailyGoalsPage
