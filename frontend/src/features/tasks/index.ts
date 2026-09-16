/**
 * Public surface of the tasks feature. Mirrors the barrel pattern
 * `features/character/index.ts` already establishes in this codebase:
 * everything outside this folder imports from here.
 *
 * Sprint 7.1B added the reward-integration seam (`useTaskCompletion`,
 * `runTaskCompletion`, `completeTask`). Sprint 7.2C added the read side
 * (`useTasks`, `fetchTasks`) used by the Study Room's task picker, and
 * replaced the placeholder `Task` shape with the real backend contract.
 * Sprint 7.3A adds the remaining write side (`useTaskMutations`,
 * `createTask`/`updateTask`/`deleteTask`/`reopenTask`) for the Tasks
 * page, and generalizes `useTasks` to take a status filter.
 */
export { useTaskCompletion } from './hooks/useTaskCompletion'
export { useTasks } from './hooks/useTasks'
export { useTaskMutations } from './hooks/useTaskMutations'
export { runTaskCompletion } from './runTaskCompletion'
export type { TaskCompletionDeps, TaskCompletionResult } from './runTaskCompletion'
export { completeTask, reopenTask, createTask, updateTask, deleteTask, fetchTasks } from './api/taskService'
export type { Task, TaskStatus, TaskPriority, TaskWriteRequest } from './types/task'
