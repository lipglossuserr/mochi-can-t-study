import type { AxiosResponse } from 'axios'
import api from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api'
import type { Task, TaskStatus, TaskWriteRequest } from '../types/task'

/**
 * All /api/tasks calls. Uses the shared axios instance from
 * src/api/axiosClient.ts, which already attaches the Firebase ID
 * token — nothing here touches auth directly, same convention as
 * petService.ts and studySessionService.ts.
 *
 * Sprint 7.1B added `completeTask` speculatively, ahead of the Task
 * module existing on the backend at all. It shipped for real in Sprint
 * 7.2A/7.2B; `fetchTasks` (Sprint 7.2C, for linking a task to a Study
 * Room session) was the first consumer to rely on the module actually
 * being there.
 *
 * Sprint 7.3A adds the remaining CRUD surface (`createTask`,
 * `updateTask`, `deleteTask`, `reopenTask`) for the new Tasks page.
 * This repo only ships the frontend, so the backend's exact route
 * shapes for these four aren't directly inspectable here — they're
 * written to match the one server-confirmed convention already in
 * this file (`POST /tasks/{id}/complete`) and standard REST semantics
 * for a resource collection: `POST /tasks` to create, `PUT /tasks/{id}`
 * to replace the editable fields, `DELETE /tasks/{id}` to remove, and
 * `POST /tasks/{id}/reopen` as `complete`'s mirror-image action. If
 * the real backend routes differ, this file is the only place that
 * needs to change — every caller goes through here.
 */

export function completeTask(id: number): Promise<AxiosResponse<ApiResponse<Task>>> {
  return api.post(`/tasks/${id}/complete`)
}

/**
 * POST /api/tasks/{id}/reopen — the mirror of `completeTask`: moves a
 * COMPLETED task back to PENDING. No reward-pipeline call here (unlike
 * `completeTask`'s consumer, `useTaskCompletion`) — reopening undoes a
 * completion, it doesn't earn a second one.
 */
export function reopenTask(id: number): Promise<AxiosResponse<ApiResponse<Task>>> {
  return api.post(`/tasks/${id}/reopen`)
}

/** POST /api/tasks — create a new task for the authenticated user. */
export function createTask(payload: TaskWriteRequest): Promise<AxiosResponse<ApiResponse<Task>>> {
  return api.post('/tasks', payload)
}

/** PUT /api/tasks/{id} — replace an existing task's editable fields. */
export function updateTask(
  id: number,
  payload: TaskWriteRequest,
): Promise<AxiosResponse<ApiResponse<Task>>> {
  return api.put(`/tasks/${id}`, payload)
}

/** DELETE /api/tasks/{id} — permanently remove a task. */
export function deleteTask(id: number): Promise<AxiosResponse<ApiResponse<null>>> {
  return api.delete(`/tasks/${id}`)
}

/**
 * GET /api/tasks — the authenticated user's tasks, optionally filtered
 * by status (e.g. `'PENDING'` for the Study Room's task picker, which
 * has no use for already-completed tasks).
 */
export function fetchTasks(status?: TaskStatus): Promise<AxiosResponse<ApiResponse<Task[]>>> {
  return api.get('/tasks', { params: status ? { status } : undefined })
}
