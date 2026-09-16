import { describe, it, expect } from 'vitest'
import { formatTaskDate, isOverdue, toDateInputValue } from '../features/tasks/utils/formatTaskDate'

describe('formatTaskDate — Sprint 7.3A task date formatting', () => {
  it('formats an ISO date-time string as "MMM d, yyyy"', () => {
    expect(formatTaskDate('2026-07-18T14:30:00Z')).toBe('Jul 18, 2026')
  })

  it('returns null for a null input', () => {
    expect(formatTaskDate(null)).toBeNull()
  })

  it('returns null instead of throwing on an unparseable string', () => {
    expect(formatTaskDate('not-a-date')).toBeNull()
  })
})

describe('isOverdue', () => {
  it('is true for a PENDING task with a due date in the past', () => {
    expect(isOverdue('2020-01-01T00:00:00Z', 'PENDING')).toBe(true)
  })

  it('is false for a PENDING task with a due date in the future', () => {
    expect(isOverdue('2099-01-01T00:00:00Z', 'PENDING')).toBe(false)
  })

  it('is false for a COMPLETED task even with a past due date — completion supersedes it', () => {
    expect(isOverdue('2020-01-01T00:00:00Z', 'COMPLETED')).toBe(false)
  })

  it('is false when there is no due date at all', () => {
    expect(isOverdue(null, 'PENDING')).toBe(false)
  })
})

describe('toDateInputValue', () => {
  it('formats an ISO date-time string as yyyy-MM-dd for a native date input', () => {
    expect(toDateInputValue('2026-07-18T14:30:00Z')).toBe('2026-07-18')
  })

  it('returns an empty string for a null input', () => {
    expect(toDateInputValue(null)).toBe('')
  })
})
