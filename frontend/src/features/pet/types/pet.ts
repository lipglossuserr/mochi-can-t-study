/**
 * The set of animation states Mochi can be in. IDLE / STUDYING /
 * CELEBRATING come from the backend's `pet.state` field. HAPPY is a
 * frontend-only, display-instant state (Sprint 4D) used to give Feed
 * and Play immediate visual feedback without waiting on — or requiring
 * — any backend concept of "happy". It's applied as a temporary local
 * override on top of whatever the backend last reported; nothing here
 * widens what the backend itself is expected to send.
 */
export type PetState = 'IDLE' | 'STUDYING' | 'CELEBRATING' | 'HAPPY'

/**
 * Shape of GET /api/pet, as returned by the Sprint 4A pet backend.
 *
 * `currentStreak`/`longestStreak` were added once the backend started
 * returning them (see `PetResponse.java`) — exactly the extension
 * point `rewardPipeline.ts`'s doc comment anticipated. The reward-diff
 * celebration pipeline itself still doesn't diff streaks (that's a
 * separate, later change); this is just the read-only display value
 * used by the Profile page's stats card.
 */
export interface Pet {
  name: string
  level: number
  xp: number
  coins: number
  mood: number
  hunger: number
  bond: number
  stage: string
  state: PetState
  currentStreak: number
  longestStreak: number
}
