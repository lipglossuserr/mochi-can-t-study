import type { DailyGoal } from '../types/dailyGoal'

/**
 * Small, dependency-free progress math for a goal — same spirit as
 * `features/pet/utils/xp.ts`'s `getXpProgress`: never lets a component
 * compute a percentage inline, and clamps defensively in case a goal's
 * `currentValue` ever exceeds its `targetValue` (e.g. a linked study
 * session overshooting a "minutes" target).
 */
export function getGoalProgress(goal: Pick<DailyGoal, 'currentValue' | 'targetValue'>) {
  const target = Math.max(goal.targetValue, 0)
  const current = Math.max(goal.currentValue, 0)
  const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  return { current, target, percent }
}

/** e.g. "3 / 5 sessions" or "12 / 30" when there's no unit. */
export function formatGoalProgressLabel(
  goal: Pick<DailyGoal, 'currentValue' | 'targetValue' | 'unit'>,
): string {
  const { current, target } = getGoalProgress(goal)
  return goal.unit ? `${current} / ${target} ${goal.unit}` : `${current} / ${target}`
}
