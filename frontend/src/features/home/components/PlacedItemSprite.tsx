import { useState } from 'react'
import type { ShopItem } from '@/features/shop'

interface PlacedItemSpriteProps {
  item: ShopItem
  sizeClassName?: string
}

/**
 * PlacedItemSprite
 *
 * The one place that renders an owned item's actual artwork, shared by
 * `InventoryTray` (tray tiles) and `PlacedFurnitureLayer` (room sprites)
 * so both draw from the same img-with-emoji-fallback logic
 * `CatalogItemCard` already established for the shop grid, instead of
 * each place re-implementing its own `onError` handler.
 */
function PlacedItemSprite({ item, sizeClassName = 'h-10 w-10 sm:h-12 sm:w-12' }: PlacedItemSpriteProps) {
  const [imageFailed, setImageFailed] = useState(false)

  if (imageFailed) {
    return (
      <span className="text-3xl sm:text-4xl" aria-hidden="true">
        {item.fallbackEmoji}
      </span>
    )
  }

  return (
    <img
      src={item.imagePath}
      alt={item.name}
      className={`${sizeClassName} object-contain drop-shadow-[0_6px_10px_rgba(75,46,61,0.25)]`}
      draggable={false}
      onError={() => setImageFailed(true)}
    />
  )
}

export default PlacedItemSprite
