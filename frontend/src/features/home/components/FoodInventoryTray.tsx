import type { RefObject } from 'react'
import { useDraggableSprite } from '@/hooks/useDraggableSprite'
import type { InventoryEntry } from '@/features/shop'
import PlacedItemSprite from './PlacedItemSprite'

interface FoodInventoryTrayProps {
    entries: InventoryEntry[]
    /** Mochi's own bounding element — same drop zone Feed/Play's drag tiles already use. */
    dropZoneRef: RefObject<HTMLElement | null>
    onConsume: (inventoryEntryId: number) => void
    isConsuming: (inventoryEntryId: number) => boolean
    /** Forwarded to useDraggableSprite — powers Mochi's "chase the toy" reaction while a food tile is being dragged. Harmless to omit. */
    onDragMove?: (clientX: number, clientY: number) => void
    /** Forwarded to useDraggableSprite — fires on ANY drag end (hit, miss, or cancelled). */
    onDragEnd?: () => void
}

/**
 * FoodInventoryTray
 *
 * Purchased-but-uneaten FOOD, opened via the Feed button (see
 * HomeRoomPage's `activeTray`). Same drag mechanism as InventoryTray/
 * PlacedFurnitureLayer — useDraggableSprite picks a tile up and
 * hit-tests the release point against `dropZoneRef` (Mochi herself,
 * not the room) — but the drop action is "consume" (feed + delete),
 * not "place", so this is a separate small component rather than
 * forcing InventoryTray's onPlace(x, y) shape onto a feed gesture.
 */
function FoodInventoryTray({ entries, dropZoneRef, onConsume, isConsuming, onDragMove, onDragEnd }: FoodInventoryTrayProps) {
    if (entries.length === 0) {
        return (
            <p className="text-center font-body text-[11px] text-ink/40">
                No food yet — buy some from the Shop.
            </p>
        )
    }

    return (
        <div className="flex flex-col items-center gap-2">
            <p className="font-body text-[11px] text-ink/40">drag onto Mochi to feed her</p>
            <div className="flex flex-wrap items-start justify-center gap-4 sm:gap-5">
                {entries.map((entry) => (
                    <FoodTrayTile
                        key={entry.id}
                        entry={entry}
                        dropZoneRef={dropZoneRef}
                        onConsume={onConsume}
                        pending={isConsuming(entry.id)}
                        onDragMove={onDragMove}
                        onDragEnd={onDragEnd}
                    />
                ))}
            </div>
        </div>
    )
}

interface FoodTrayTileProps {
    entry: InventoryEntry
    dropZoneRef: RefObject<HTMLElement | null>
    onConsume: (inventoryEntryId: number) => void
    pending: boolean
    onDragMove?: (clientX: number, clientY: number) => void
    onDragEnd?: () => void
}

function FoodTrayTile({ entry, dropZoneRef, onConsume, pending, onDragMove, onDragEnd }: FoodTrayTileProps) {
    const { isDragging, dragStyle, handlers } = useDraggableSprite({
        dropZoneRef,
        disabled: pending,
        onDrop: (info) => {
            if (info.hit) onConsume(entry.id)
        },
        onDragMove,
        onDragEnd,
    })

    return (
        <div className="flex flex-col items-center gap-1.5">
            <div
                {...handlers}
                style={dragStyle}
                role="button"
                tabIndex={0}
                aria-label={`Drag ${entry.item.name} onto Mochi to feed her`}
                aria-disabled={pending}
                className={`relative flex h-16 w-16 touch-none select-none items-center justify-center rounded-full border border-white/60 bg-gradient-to-b from-butter/70 to-blush-light/60 shadow-[0_12px_24px_-10px_rgba(224,112,158,0.5)] backdrop-blur-xl sm:h-[4.5rem] sm:w-[4.5rem] ${
                    isDragging ? 'shadow-xl' : ''
                } ${pending ? 'pointer-events-none opacity-45' : ''}`}
            >
                <PlacedItemSprite item={entry.item} />
            </div>
            <span className="max-w-[4.5rem] truncate font-body text-[11px] font-medium text-ink/50 sm:text-xs">
        {entry.item.name}
      </span>
        </div>
    )
}

export default FoodInventoryTray