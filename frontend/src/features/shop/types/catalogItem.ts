/**
 * Types for the furniture/toy/decoration side of the Shop — the
 * backend-catalog counterpart to `ShopFoodItem` (which stays a plain
 * frontend constant; see its own doc comment for why food never got
 * this treatment).
 *
 * Field names are a direct mirror of the backend's ItemResponse /
 * InventoryEntryResponse / PurchaseResponse Java DTOs (Jackson's
 * default serialization keeps camelCase field names as-is, so no
 * mapping layer is needed here — the JSON shape IS the TS shape).
 */
import type { Pet } from '@/features/pet/types/pet'

export type ItemCategory = 'FURNITURE' | 'TOY' | 'DECORATION' | 'FOOD' | 'SKIN'

export type ItemLayer = 'BEHIND_MOCHI' | 'IN_FRONT_OF_MOCHI'

/** One row from the catalog — GET /api/shop/items. */
export interface ShopItem {
  id: number
  itemKey: string
  name: string
  description: string
  category: ItemCategory
  price: number
  /** Null for FOOD and SKIN items — neither has a room presence (food is eaten, skins are equipped onto the pet). See Item.java's `layer` doc comment. */
  layer: ItemLayer | null
  imagePath: string
  fallbackEmoji: string
}

/**
 * One owned instance — GET /api/inventory. `placed`/`roomLayoutEntryId`
 * are what let the (future) inventory tray tell owned-but-unplaced
 * items apart from ones already sitting in the room, without a second
 * round trip per item.
 */
export interface InventoryEntry {
  id: number
  item: ShopItem
  acquiredAt: string
  placed: boolean
  roomLayoutEntryId: number | null
}

/** Response body of POST /api/shop/purchase. */
export interface PurchaseResult {
  inventoryEntry: InventoryEntry
  /** The pet with its updated coin balance — see PurchaseResponse's doc comment on the Java side for why it's bundled here instead of a second GET /pet call. */
  pet: Pet
}

/**
 * One placed item — GET/POST/PATCH /api/room-layout. `item` is embedded
 * directly (mirrors RoomLayoutResponse on the Java side) so
 * PlacedFurnitureLayer can render straight off this list, no per-item
 * follow-up fetch for artwork/layer. `x`/`y` are 0–100 percentages of
 * the room's own width/height, not pixels — same "responsive by
 * definition" approach every static room layer already uses for its
 * hand-placed furniture, just data-driven here instead of a literal
 * Tailwind class.
 */
export interface RoomLayoutEntry {
  id: number
  inventoryEntryId: number
  item: ShopItem
  x: number
  y: number
  zIndex: number
  rotation: number | null
  placedAt: string
  updatedAt: string
}
