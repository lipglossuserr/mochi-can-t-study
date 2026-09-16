/**
 * Mirrors the backend's Daily Goals contract (`/api/daily-goals`, Sprint
 * 7.4A/7.4B). This frontend repo doesn't have that backend source to
 * inspect directly, so this shape is written the same way
 * `features/tasks/types/task.ts` mirrors `TaskResponse` — a plain
 * progress-tracked goal, scoped to "today" the same way the sprint brief
 * describes ("today's goals"), following the same server-authoritative
 * convention every other feature here uses: `currentValue` always comes
 * from the server, never computed or incremented client-side (see this
 * sprint's "do not auto-update progress" instruction).
 */
export type GoalStatus = 'PENDING' | 'COMPLETED'

export interface DailyGoal {
  id: number
  title: string
  description: string | null
  /** The amount that counts as "done" for this goal, e.g. 3 (sessions), 60 (minutes). */
  targetValue: number
  /** Server-maintained progress toward targetValue. Never written to by this frontend. */
  currentValue: number
  /** Free-form display unit, e.g. "minutes", "sessions", "pages". Null for a bare count. */
  unit: string | null
  status: GoalStatus
  /** The calendar day (yyyy-MM-dd) this goal instance belongs to. */
  goalDate: string
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Request body for the write side of `/api/daily-goals` (create + edit).
 * Same convention as `TaskWriteRequest`: mirrors the editable subset of
 * `DailyGoal` minus every server-owned field (`id`, `currentValue`,
 * `status`, `goalDate`, `completedAt`, `createdAt`, `updatedAt`) — a
 * person sets what "done" means for a goal, never its progress or
 * completion directly.
 */
export interface DailyGoalWriteRequest {
  title: string
  description: string | null
  targetValue: number
  unit: string | null
}
