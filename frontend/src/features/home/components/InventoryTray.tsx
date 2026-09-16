import type { RefObject } from 'react'
import { useDraggableSprite } from '@/hooks/useDraggableSprite'
import type { InventoryEntry } from '@/features/shop'
import { overlapsAnyOtherItem } from '../utils/roomCollision'
import PlacedItemSprite from './PlacedItemSprite'

interface InventoryTrayProps {
    entries: InventoryEntry[]
    roomRef: RefObject<HTMLElement | null>
    onPlace: (inventoryEntryId: number, x: number, y: number) => void
    isPlacing: (inventoryEntryId: number) => boolean
    /** Called instead of `onPlace` when the drop would overlap another placed item or fall outside the room. */
    onInvalidPlacement?: () => void
}

function InventoryTray({ entries, roomRef, onPlace, isPlacing, onInvalidPlacement }: InventoryTrayProps) {
    if (entries.length === 0) {
        return <p className="text-center font-body text-[11px] text-ink/40">Nothing to place yet — buy furniture, toys, or decor from the Shop.</p>
    }

    return (
        <div className="flex flex-col items-center gap-2">
            <p className="font-body text-[11px] text-ink/40">drag into the room to place</p>
            <div className="flex flex-wrap items-start justify-center gap-4 sm:gap-5">
                {entries.map((entry) => (
                    <InventoryTrayTile
                        key={entry.id}
                        entry={entry}
                        roomRef={roomRef}
                        onPlace={onPlace}
                        pending={isPlacing(entry.id)}
                        onInvalidPlacement={onInvalidPlacement}
                    />
                ))}
            </div>
        </div>
    )
}

interface InventoryTrayTileProps {
    entry: InventoryEntry
    roomRef: RefObject<HTMLElement | null>
    onPlace: (inventoryEntryId: number, x: number, y: number) => void
    pending: boolean
    onInvalidPlacement?: () => void
}

function InventoryTrayTile({ entry, roomRef, onPlace, pending, onInvalidPlacement }: InventoryTrayTileProps) {
    const { isDragging, dragStyle, handlers } = useDraggableSprite({
        dropZoneRef: roomRef,
        disabled: pending,
        onDrop: (info) => {
            const room = roomRef.current
            // A genuine miss (dropped nowhere near the room at all)
            // just leaves the item in the tray — that's correct,
            // expected behavior for a fresh unplaced item, unlike a
            // reposition of something already IN the room.
            if (!info.hit || !room) return

            const rect = room.getBoundingClientRect()
            const x = clampPercent(((info.clientX - rect.left) / rect.width) * 100)
            const y = clampPercent(((info.clientY - rect.top) / rect.height) * 100)

            // Only a real overlap with an already-placed item blocks
            // the drop — no "must be 100% inside the room" requirement,
            // since x/y above is already clamped into the room's bounds.
            if (overlapsAnyOtherItem(room, info.rect)) {
                onInvalidPlacement?.()
                return
            }

            onPlace(entry.id, x, y)
        },
    })

    return (
        <div className="flex flex-col items-center gap-1.5">
            <div
                {...handlers}
                style={dragStyle}
                role="button"
                tabIndex={0}
                aria-label={`Drag ${entry.item.name} into the room to place it`}
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

function clampPercent(value: number): number {
    return Math.min(100, Math.max(0, value))
}

export default InventoryTray