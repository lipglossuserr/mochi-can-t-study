import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import FadeInSection from '@/components/FadeInSection'
import Toast from '@/components/Toast'
import RewardCelebration from '@/features/pet/components/RewardCelebration'
import { useTasks, useTaskCompletion, useTaskMutations } from '@/features/tasks'
import type { Task, TaskStatus, TaskWriteRequest } from '@/features/tasks'
import TaskFilterTabs from '@/components/tasks/TaskFilterTabs'
import TaskListItem from '@/components/tasks/TaskListItem'
import TaskListSkeleton from '@/components/tasks/TaskListSkeleton'
import TaskErrorState from '@/components/tasks/TaskErrorState'
import TaskEmptyState from '@/components/tasks/TaskEmptyState'
import TaskFormModal from '@/components/tasks/TaskFormModal'
import DeleteTaskDialog from '@/components/tasks/DeleteTaskDialog'

/**
 * TasksPage — Sprint 7.3A.
 *
 * The first full task management screen: view/create/edit/delete,
 * complete/reopen, and a Pending/Completed filter. Composed entirely
 * from existing and newly-added `features/tasks` hooks — this page
 * owns no fetching or mutation logic of its own, only the small bits
 * of local UI state (which filter tab, which modal/dialog is open,
 * which task ids are mid-flight) that genuinely belong to the page.
 *
 * `useTaskCompletion` (Sprint 7.1B) already wires task completion into
 * the shared pet reward pipeline — this is the first page to actually
 * mount it, exactly as its own doc comment anticipated. `<RewardCelebration/>`
 * is reused unmodified, same as `SessionSummary` in the Study Room.
 */
function TasksPage() {
  const [filter, setFilter] = useState<TaskStatus>('PENDING')
  const { tasks, loading, error, reload } = useTasks(filter)
  const { completeTaskAndCelebrate, completingId, error: completeError, dismissError: dismissCompleteError } =
    useTaskCompletion()
  const {
    create,
    save,
    remove,
    reopen,
    creating,
    savingId,
    deletingId,
    reopeningId,
    error: mutationError,
    dismissError: dismissMutationError,
  } = useTaskMutations()

  const [formState, setFormState] = useState<{ mode: 'create' | 'edit'; task: Task | null } | null>(
    null,
  )
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)

  // A task leaving the current filter (completing while on Pending,
  // reopening while on Completed, deleting from either) should
  // disappear right away rather than waiting for the reload() round
  // trip to finish and re-render — this is what makes "update the UI
  // immediately" actually feel immediate. `reload()` re-syncs against
  // the server right after, so this is purely a perceived-latency
  // hide, not a second source of truth.
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

  const handleComplete = async (id: number) => {
    const ok = await completeTaskAndCelebrate(id)
    if (ok) await hideThenReload(id)
  }

  const handleReopen = async (id: number) => {
    const ok = await reopen(id)
    if (ok) await hideThenReload(id)
  }

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    const ok = await remove(id)
    setDeleteTarget(null)
    if (ok) await hideThenReload(id)
  }

  const handleCreateSubmit = async (payload: TaskWriteRequest): Promise<boolean> => {
    const created = await create(payload)
    if (!created) return false
    // A new task is always PENDING — switch to that tab so it's
    // actually visible instead of seeming to vanish if the person was
    // looking at Completed. Changing `filter` re-triggers useTasks's
    // own fetch, so no separate reload() is needed on this branch.
    if (filter === 'PENDING') {
      await reload()
    } else {
      setFilter('PENDING')
    }
    return true
  }

  const handleEditSubmit = async (payload: TaskWriteRequest): Promise<boolean> => {
    if (!formState?.task) return false
    const saved = await save(formState.task.id, payload)
    if (!saved) return false
    await reload()
    return true
  }

  const visibleTasks = tasks.filter((task) => !hiddenIds.has(task.id))
  const modalOpen = Boolean(formState) || Boolean(deleteTarget)

  return (
    <div className="mx-auto w-full max-w-3xl">
      <FadeInSection>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="font-body text-sm text-ink/55">Keep track of what needs doing ♡</p>
          <button
            type="button"
            onClick={() => setFormState({ mode: 'create', task: null })}
            className="rounded-full bg-taro px-5 py-2.5 font-body text-sm font-semibold text-white shadow-lg shadow-taro/30 transition-colors hover:bg-taro-dark"
          >
            + New task
          </button>
        </div>
      </FadeInSection>

      <FadeInSection delay={0.08} className="mt-6">
        <TaskFilterTabs value={filter} onChange={setFilter} />
      </FadeInSection>

      {(completeError || mutationError) && !modalOpen && (
        <div className="mt-4">
          <Toast
            message={completeError ?? mutationError}
            onDismiss={() => {
              dismissCompleteError()
              dismissMutationError()
            }}
          />
        </div>
      )}

      <FadeInSection delay={0.14} className="mt-6">
        <RewardCelebration />

        {loading ? (
          <TaskListSkeleton />
        ) : error ? (
          <TaskErrorState message={error} onRetry={reload} />
        ) : visibleTasks.length === 0 ? (
          <TaskEmptyState
            status={filter}
            onCreate={() => setFormState({ mode: 'create', task: null })}
          />
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {visibleTasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  onComplete={handleComplete}
                  onReopen={handleReopen}
                  onEdit={(selected) => setFormState({ mode: 'edit', task: selected })}
                  onDeleteRequest={setDeleteTarget}
                  completing={completingId === task.id}
                  reopening={reopeningId === task.id}
                  deleting={deletingId === task.id}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </FadeInSection>

      {formState && (
        <TaskFormModal
          mode={formState.mode}
          task={formState.task}
          submitting={formState.mode === 'create' ? creating : savingId === formState.task?.id}
          error={mutationError}
          onSubmit={formState.mode === 'create' ? handleCreateSubmit : handleEditSubmit}
          onClose={() => setFormState(null)}
        />
      )}

      {deleteTarget && (
        <DeleteTaskDialog
          task={deleteTarget}
          deleting={deletingId === deleteTarget.id}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

export default TasksPage
