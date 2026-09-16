import type { TaskStatus } from '../types/task'

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/**
 * Sprint 7.3A — small, dependency-free date helpers for task display.
 *
 * `dueDate`/`completedAt` from the backend are ISO strings (a bare
 * `yyyy-MM-dd` or a full date-time). Every helper here reads the
 * calendar date in UTC rather than the viewer's local timezone on
 * purpose: a *due date* is a calendar day, not an instant, and
 * `new Date('2026-07-18').getDate()` (local-time getters on a
 * UTC-midnight value) is a well-known footgun that silently shows the
 * wrong day for anyone west of UTC. `date-fns` is already a project
 * dependency, but its `format()` has the exact same local-timezone
 * behavior, so plain UTC-getter math is the safer tool for this one
 * job — no new dependency either way.
 */
function parseDate(value: string): Date | null {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Displays as e.g. "Jul 18, 2026". */
export function formatTaskDate(value: string | null): string | null {
  if (!value) return null
  const date = parseDate(value)
  if (!date) return null
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
}

/** A PENDING task whose due date's calendar day has already passed (in UTC). */
export function isOverdue(dueDate: string | null, status: TaskStatus): boolean {
  if (!dueDate || status !== 'PENDING') return false
  const date = parseDate(dueDate)
  if (!date) return false
  const now = new Date()
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const dueUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  return dueUtc < todayUtc
}

/** For the `<input type="date">` in the create/edit form, which needs `yyyy-MM-dd`. */
export function toDateInputValue(value: string | null): string {
  if (!value) return ''
  const date = parseDate(value)
  if (!date) return ''
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${date.getUTCFullYear()}-${mm}-${dd}`
}
