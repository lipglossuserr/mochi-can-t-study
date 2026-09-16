/**
 * Public surface of the shop feature. Mirrors the barrel pattern
 * `features/character/index.ts` and `features/tasks/index.ts` already
 * establish in this codebase: everything outside this folder imports
 * from here.
 */
export { FOOD_CATALOG } from './data/foodCatalog'
export type { ShopFoodItem } from './data/foodCatalog'
export { spendCoins, fetchShopItems, purchaseItem, fetchInventory, fetchRoomLayout, placeItem, repositionItem, consumeInventoryItem, unplaceItem } from './api/shopService'
export { default as FoodItemCard } from './components/FoodItemCard'


// Furniture/toy/decoration catalog — the backend-catalog counterpart to
// FOOD_CATALOG/FoodItemCard above. See catalogItem.ts's doc comment for
// why these have their own types instead of reusing ShopFoodItem.
export type { ItemCategory, ItemLayer, ShopItem, InventoryEntry, PurchaseResult, RoomLayoutEntry } from './types/catalogItem'
export { default as CatalogItemCard } from './components/CatalogItemCard'
export { default as ShopSectionTabs, type ShopSection } from './components/ShopSectionTabs'
export { default as CategoryFilterChips, type CategoryFilter } from './components/CategoryFilterChips'
export { useShopCatalog } from './hooks/useShopCatalog'
