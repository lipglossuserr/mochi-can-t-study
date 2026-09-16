/**
 * Mirrors the backend's `TaskResponse` DTO (`/api/tasks`, shipped in
 * Sprint 7.2A/7.2B — see `backend/src/main/java/.../task/dto/TaskResponse.java`).
 *
 * Sprint 7.1B originally sketched this as a placeholder (`{ id, title,
 * completed }`) ahead of the Task module existing at all. Sprint 7.2C
 * replaces that sketch with the real response shape now that the
 * endpoint is live, the same way `StudySession` mirrors its backend DTO
 * in `types/studySession.ts`.
 */
export type TaskStatus = 'PENDING' | 'COMPLETED'

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'

export interface Task {
  id: number
  title: string
  description: string | null
  dueDate: string | null
  priority: TaskPriority
  status: TaskStatus
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Sprint 7.3A — request body for the write side of `/api/tasks`
 * (create + edit), mirroring the fields `TaskResponse` already exposes
 * minus the server-owned ones (`id`, `status`, `completedAt`,
 * `createdAt`, `updatedAt`). Same shape for both create and update —
 * title/description/dueDate/priority are the only fields a person
 * ever edits either way, same convention as `StartSessionRequest`
 * mirroring `StudySession`.
 */
export interface TaskWriteRequest {
  title: string
  description: string | null
  dueDate: string | null
  priority: TaskPriority
}
