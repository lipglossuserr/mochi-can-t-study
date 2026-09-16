/**
 * Shape of one entry in GET /api/achievements/me, as returned by
 * `AchievementController` / `AchievementResponse.java`. Always the full
 * catalog entry (title/description/emoji) plus whether and when this
 * specific user unlocked it — `unlockedAt` is null for a locked
 * achievement, never omitted.
 */
export interface Achievement {
  key: string
  title: string
  description: string
  emoji: string
  unlocked: boolean
  unlockedAt: string | null
}
