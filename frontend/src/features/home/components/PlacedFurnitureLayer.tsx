import { useEffect, useState, type RefObject } from 'react'
import { useDraggableSprite } from '@/hooks/useDraggableSprite'
import type { RoomLayoutEntry } from '@/features/shop'
import { overlapsAnyOtherItem, isPointInRect } from '../utils/roomCollision'
import PlacedItemSprite from './PlacedItemSprite'
import DropReactionBurst from './DropReactionBurst'

interface PlacedFurnitureLayerProps {
    entries: RoomLayoutEntry[]
    roomRef: RefObject<HTMLElement | null>
    onReposition: (layoutEntryId: number, x: number, y: number) => void
    isRepositioning: (layoutEntryId: number) => boolean
    placementPulse: { layoutEntryId: number; nonce: number } | null
    layerKind: 'behind' | 'front'
    className?: string
    onInvalidPlacement?: () => void
    /** The trash-can drop target — checked BEFORE the room hit-test on every drop, so dropping there removes instead of repositioning. */
    removeZoneRef?: RefObject<HTMLElement | null>
    onRemove?: (layoutEntryId: number) => void
    isRemoving?: (layoutEntryId: number) => boolean
    /** Fired whenever any sprite's own drag state flips, so the page can show RemoveDropZone only while something is actually being dragged. */
    onDragActiveChange?: (layoutEntryId: number, active: boolean) => void
    /**
     * True while the Decor tray is open. Placed items are ALWAYS
     * draggable/removable, in every session, regardless of this flag —
     * it's purely a cosmetic cue (a soft ring + a gentle wiggle) that
     * says "you can rearrange things right now," the same spirit as a
     * home screen's jiggling icons, but never a functional gate. Never
     * make dragging/removal depend on this again.
     */
    decorMode: boolean
}

function PlacedFurnitureLayer({
                                  entries,
                                  roomRef,
                                  onReposition,
                                  isRepositioning,
                                  placementPulse,
                                  layerKind,
                                  className = '',
                                  onInvalidPlacement,
                                  removeZoneRef,
                                  onRemove,
                                  isRemoving,
                                  onDragActiveChange,
                                  decorMode,
                              }: PlacedFurnitureLayerProps) {
    return (
        <div className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden="true">
            {entries.map((entry, index) => (
                <PlacedFurnitureSprite
                    key={entry.id}
                    entry={entry}
                    roomRef={roomRef}
                    onReposition={onReposition}
                    pending={isRepositioning(entry.id) || (isRemoving?.(entry.id) ?? false)}
                    burstTrigger={placementPulse?.layoutEntryId === entry.id ? placementPulse.nonce : 0}
                    layerKind={layerKind}
                    onInvalidPlacement={onInvalidPlacement}
                    removeZoneRef={removeZoneRef}
                    onRemove={onRemove}
                    onDragActiveChange={onDragActiveChange}
                    decorMode={decorMode}
                    wiggleIndex={index}
                />
            ))}
        </div>
    )
}

interface PlacedFurnitureSpriteProps {
    entry: RoomLayoutEntry
    roomRef: RefObject<HTMLElement | null>
    onReposition: (layoutEntryId: number, x: number, y: number) => void
    pending: boolean
    burstTrigger: number
    layerKind: 'behind' | 'front'
    onInvalidPlacement?: () => void
    removeZoneRef?: RefObject<HTMLElement | null>
    onRemove?: (layoutEntryId: number) => void
    onDragActiveChange?: (layoutEntryId: number, active: boolean) => void
    decorMode: boolean
    wiggleIndex: number
}

function PlacedFurnitureSprite({
                                   entry,
                                   roomRef,
                                   onReposition,
                                   pending,
                                   burstTrigger,
                                   layerKind,
                                   onInvalidPlacement,
                                   removeZoneRef,
                                   onRemove,
                                   onDragActiveChange,
                                   decorMode,
                                   wiggleIndex,
                               }: PlacedFurnitureSpriteProps) {
    // Always draggable — the only thing that can disable a pickup is
    // an in-flight network call for THIS item (pending). Decor mode is
    // never checked here; whether the tray happens to be open has no
    // bearing on whether you can pick this item up and move it.
    const { isDragging, dragStyle, handlers } = useDraggableSprite({
        dropZoneRef: roomRef,
        disabled: pending,
        onDrop: (info) => {
            // Remove zone wins first: it's a fixed, viewport-level target
            // outside the room, so this is checked independently of the
            // room's own hit-test rather than as a fallback from it.
            const removeZone = removeZoneRef?.current
            if (removeZone && isPointInRect(info.clientX, info.clientY, removeZone)) {
                onRemove?.(entry.id)
                return
            }

            const room = roomRef.current
            if (!room) return

            // Deliberately NOT gated on `info.hit` (a strict "pointer
            // released at a pixel literally inside the room's rect"
            // check). That's what made repositioning feel "stuck" —
            // a drag ending a few pixels past an edge or one of the
            // room's rounded corners would silently miss and snap the
            // item straight back with zero feedback. Instead: always
            // clamp the release point into the room's bounds, so a
            // reposition can never fail just because you let go a
            // little outside the strict edge.
            const roomRect = room.getBoundingClientRect()
            const x = clampPercent(((info.clientX - roomRect.left) / roomRect.width) * 100)
            const y = clampPercent(((info.clientY - roomRect.top) / roomRect.height) * 100)

            // The ONE case that still legitimately blocks a drop:
            // landing directly on top of another placed item.
            if (overlapsAnyOtherItem(room, info.rect, entry.id)) {
                onInvalidPlacement?.()
                return
            }

            onReposition(entry.id, x, y)
        },
    })

    useEffect(() => {
        onDragActiveChange?.(entry.id, isDragging)
    }, [isDragging, entry.id, onDragActiveChange])

    const [isSquishing, setIsSquishing] = useState(false)
    useEffect(() => {
        if (burstTrigger === 0) return
        setIsSquishing(true)
        const timeout = window.setTimeout(() => setIsSquishing(false), 420)
        return () => window.clearTimeout(timeout)
    }, [burstTrigger])

    const behind = layerKind === 'behind'
    const depthZIndex = behind
        ? 1 + Math.round((entry.y / 100) * 7) + entry.zIndex
        : 1 + Math.round((entry.y / 100) * 2000) + entry.zIndex * 2000
    const draggingZIndex = behind ? 9 : 9999

    // Purely cosmetic — Decor mode only controls the wiggle/ring hint,
    // never whether the item can actually be dragged (see hook above).
    const wiggling = decorMode && !pending && !isDragging

    return (
        <div
            {...handlers}
            data-room-item-id={entry.id}
            className="pointer-events-auto absolute touch-none select-none"
            style={{
                left: `${entry.x}%`,
                top: `${entry.y}%`,
                transform: `translate(-50%, -50%) ${dragStyle.transform}`,
                transition: dragStyle.transition,
                touchAction: dragStyle.touchAction,
                zIndex: isDragging ? draggingZIndex : depthZIndex,
                cursor: dragStyle.cursor,
                opacity: pending ? 0.7 : 1,
                // Small per-item stagger so a room full of furniture
                // wiggles out of sync rather than in lockstep.
                ['--wiggle-delay' as string]: `${(wiggleIndex % 5) * 0.06}s`,
            }}
            role="button"
            tabIndex={-1}
            aria-label={`${entry.item.name} — drag to move, or drag onto the trash can below to remove`}
        >
            <div
                className={`relative rounded-full transition-shadow duration-150 ${
                    isSquishing ? 'character-boop' : wiggling ? 'decor-wiggle' : ''
                } ${decorMode && !isDragging ? 'shadow-[0_0_0_3px_rgba(255,255,255,0.55)]' : ''}`}
            >
                <PlacedItemSprite item={entry.item} />
                <DropReactionBurst trigger={burstTrigger} />
            </div>
        </div>
    )
}

function clampPercent(value: number): number {
    return Math.min(100, Math.max(0, value))
}

export default PlacedFurnitureLayer
