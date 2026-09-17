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
 * itemKey of a SKIN item (Shop v1.1) — see `catalogItem.ts`'s
 * `ItemCategory` and `PetService.equipSkin`'s doc comment on the
 * backend. `'skin-orange'` is mochi.riv's built-in look and the only
 * one every pet starts equipped with; the others must be purchased
 * and owned before `PATCH /api/pet/skin` will accept them.
 */
export type SkinItemKey = 'skin-orange' | 'skin-calico' | 'skin-white'

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
  /** See `SkinItemKey`. Typed as `string` rather than the union since the backend is the source of truth and shouldn't be able to fail deserialization on a value the frontend hasn't caught up to yet. */
  equippedSkin: string
}
