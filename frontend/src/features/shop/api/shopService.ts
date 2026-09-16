import type { AxiosResponse } from 'axios'
import api from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api'
import type { Pet } from '@/features/pet/types/pet'
import type { InventoryEntry, PurchaseResult, RoomLayoutEntry, ShopItem } from '../types/catalogItem'

/**
 * The Shop's backend calls. Reuses the shared axios instance from
 * src/api/axiosClient.ts, same as every other feature's API module —
 * the Firebase token is already attached there, nothing here touches
 * auth directly.
 */

type PetResponse = Promise<AxiosResponse<ApiResponse<Pet>>>

/**
 * POST /api/pet/coins/spend — deducts `amount` coins if (and only if)
 * the pet has enough; the backend is the single source of truth for
 * "can afford this," never the frontend's own coin check (that check
 * exists too, in FoodItemCard, purely so the Buy button can grey out
 * without a round trip — see its doc comment).
 *
 * Food-only. Furniture/toys/decorations go through `purchaseItem`
 * below instead — see ItemResponse/SpendCoinsRequest's doc comments on
 * the Java side for why the two have separate endpoints.
 */
export function spendCoins(amount: number, reason?: string): PetResponse {
    return api.post('/pet/coins/spend', { amount, reason })
}

/** GET /api/shop/items — the furniture/toy/decoration catalog, same for every user. */
export function fetchShopItems(): Promise<AxiosResponse<ApiResponse<ShopItem[]>>> {
    return api.get('/shop/items')
}

/**
 * POST /api/shop/purchase — buys one instance of `itemId`. Unlike
 * `spendCoins`, this doesn't consume anything immediately: the backend
 * does an atomic afford-check + coin deduct + grants an inventory row,
 * so the item lands owned-but-unplaced, ready for the (upcoming) drag-
 * to-place flow onto `PlacedFurnitureLayer`.
 */
export function purchaseItem(itemId: number): Promise<AxiosResponse<ApiResponse<PurchaseResult>>> {
    return api.post('/shop/purchase', { itemId })
}

/**
 * GET /api/inventory — everything the user owns, each flagged with
 * whether (and where) it's currently placed. Not called from ShopPage
 * yet; this is here for the inventory-tray UI the next piece of this
 * feature builds on top of, so that piece doesn't have to touch this
 * file again just to add the fetch.
 */
export function fetchInventory(): Promise<AxiosResponse<ApiResponse<InventoryEntry[]>>> {
    return api.get('/inventory')
}

/**
 * GET /api/room-layout — everything currently placed in the caller's
 * room, for `PlacedFurnitureLayer` to render. Loaded alongside
 * `fetchInventory` on Home mount (see `useRoomFurniture`) so the tray
 * (unplaced) and the room (placed) are derived from one consistent
 * pair of fetches rather than the tray inferring placement itself.
 */
export function fetchRoomLayout(): Promise<AxiosResponse<ApiResponse<RoomLayoutEntry[]>>> {
    return api.get('/room-layout')
}

/**
 * POST /api/room-layout — the first drop of an owned-but-unplaced item
 * from the inventory tray onto the room floor/wall. `x`/`y` are 0–100
 * percentages of the room's bounding rect at drop time (see
 * `useRoomFurniture.place`), matching how `RoomLayoutEntry.x`/`y` are
 * documented on the Java side. `zIndex` is omitted here and left to the
 * backend's default (0) — v1 has no manual depth control within a
 * layer, see the plan's "no grid-snapping, no collision" note.
 */
export function placeItem(
    inventoryEntryId: number,
    x: number,
    y: number,
): Promise<AxiosResponse<ApiResponse<RoomLayoutEntry>>> {
    return api.post('/room-layout', { inventoryEntryId, x, y })
}

/**
 * PATCH /api/room-layout/:id — reposition an already-placed item.
 * Fired once per completed drag gesture (useDraggableSprite only calls
 * `onDrop` on release, never per pointer-move), which already satisfies
 * the backend doc comment's "not fired per pixel" expectation with no
 * extra debounce needed on top.
 */
export function repositionItem(
    id: number,
    x: number,
    y: number,
): Promise<AxiosResponse<ApiResponse<RoomLayoutEntry>>> {
    return api.patch(`/room-layout/${id}`, { x, y })
}
/**
 * POST /api/inventory/:id/consume — drops a purchased FOOD item onto
 * Mochi: atomic ownership+category check, feed, and inventory removal,
 * all server-side (see InventoryService#consumeFood on the Java side).
 * Returns the pet with its updated hunger/mood.
 */
export function consumeInventoryItem(inventoryEntryId: number): PetResponse {
    return api.post(`/inventory/${inventoryEntryId}/consume`)
}

/**
 * DELETE /api/room-layout/:id — un-places an already-placed item back
 * into the tray. Ownership is untouched server-side: only the
 * RoomLayoutEntry row is deleted, the InventoryEntry it came from is
 * unaffected — see RoomLayoutService#delete's doc comment on the Java
 * side. The item reappears in the Decor tray on the next inventory
 * read (useRoomFurniture.remove updates it locally too, so there's no
 * visible gap waiting on a refetch).
 */
export function unplaceItem(layoutEntryId: number): Promise<AxiosResponse<ApiResponse<void>>> {
    return api.delete(`/room-layout/${layoutEntryId}`)
}