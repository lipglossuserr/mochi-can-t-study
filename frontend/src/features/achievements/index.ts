/**
 * Public surface of the achievements feature. Mirrors the barrel
 * pattern `features/tasks/index.ts` establishes: everything outside
 * this folder imports from here.
 */
export { useAchievements } from './hooks/useAchievements'
export { fetchAchievements } from './api/achievementService'
export type { Achievement } from './types/achievement'
