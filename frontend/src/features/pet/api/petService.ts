import type { AxiosResponse } from 'axios'
import api from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api'
import type { Pet } from '../types/pet'

/**
 * All /api/pet calls. Reuses the shared axios instance from
 * src/api/axiosClient.ts, which already attaches the Firebase ID
 * token — nothing here touches auth directly, and nothing outside
 * the pet feature should call these endpoints directly.
 */

type PetResponse = Promise<AxiosResponse<ApiResponse<Pet>>>

/** GET /api/pet — the authenticated user's pet, with live stats. */
export function fetchPet(): PetResponse {
  return api.get('/pet')
}

/** POST /api/pet/feed — reward-engine (Sprint 4B) handles the effects. */
export function feedPet(): PetResponse {
  return api.post('/pet/feed')
}

/** POST /api/pet/play — reward-engine (Sprint 4B) handles the effects. */
export function playWithPet(): PetResponse {
  return api.post('/pet/play')
}

/**
 * PATCH /api/pet/skin — equips an owned SKIN item (Shop v1.1). 403s
 * with `SkinNotOwnedException`'s message if `itemKey` isn't owned (or
 * the free default) — see `PetService.equipSkin`'s doc comment on the
 * backend.
 */
export function equipSkin(itemKey: string): PetResponse {
  return api.patch('/pet/skin', { itemKey })
}
