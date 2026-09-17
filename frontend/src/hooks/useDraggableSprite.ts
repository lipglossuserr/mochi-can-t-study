import { useCallback, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, RefObject } from 'react'

export interface DraggableSpriteDropInfo {
    /** Whether the release point fell within the drop zone's live bounding rect. */
    hit: boolean
    /** Client (viewport) coordinates of the release point. */
    clientX: number
    clientY: number
    /**
     * The dragged element's own live bounding rect at the moment of
     * release, captured before the snap-back transition starts (see
     * `endDrag` below — read synchronously off `event.currentTarget`
     * before any state update, so it still reflects the dragged
     * position, not the resting one). Room-placement callers use this
     * against `data-room-item-id` elements for collision detection —
     * see `features/home/utils/roomCollision.ts`.
     */
    rect: { left: number; top: number; right: number; bottom: number; width: number; height: number }
}

export interface UseDraggableSpriteOptions {
    /**
     * The element a drop is tested against. Read fresh via
     * `getBoundingClientRect()` on every release — no separate
     * "register this rect" step, so a drop zone that moves, resizes,
     * or doesn't exist yet at mount (e.g. behind a loading state) just
     * works the next time a drag actually ends.
     */
    dropZoneRef: RefObject<HTMLElement | null>
    /**
     * Fired once per completed drag, hit or miss — callers branch on
     * `info.hit`. Deliberately NOT fired for a cancelled gesture (see
     * `onPointerCancel`): a cancel (e.g. the browser taking over for a
     * system gesture) isn't a release the user intended, so it
     * shouldn't count as either a successful drop or a deliberate miss.
     */
    onDrop: (info: DraggableSpriteDropInfo) => void
    /** When true, pointerdown does nothing — e.g. while a previous drop's API call is still in flight. */
    disabled?: boolean
    /**
     * Fired on every pointer move while dragging, with the raw
     * viewport (client) coordinates — same coordinates `onDrop`
     * receives. Optional: added for Mochi's "chase the toy" reaction
     * (a caller converts these into the room's percentage coordinate
     * space and feeds them to the character engine's `moveTo`), but
     * nothing about the pick-up/follow/drop-test mechanics above
     * depends on this being wired up.
     */
    onDragMove?: (clientX: number, clientY: number) => void
    /**
     * Fired unconditionally the instant ANY drag ends — hit, miss, OR
     * cancelled (unlike `onDrop`, which skips cancelled gestures).
     * Exists specifically so a caller doing something continuous
     * during the drag (like the chase reaction `onDragMove` enables)
     * has one reliable place to stop it, regardless of how the drag
     * ended.
     */
    onDragEnd?: () => void
}

export interface UseDraggableSpriteResult {
    isDragging: boolean
    /**
     * Spread onto the draggable element's `style`. Follows the pointer
     * 1:1 while dragging (translate transform, same technique
     * `usePetting` already uses for tracking pointer movement — just
     * applied to the sprite's own transform instead of to particle
     * placement), and springs back to its resting position on release
     * via a CSS transition that only turns on once the drag ends.
     */
    dragStyle: CSSProperties
    handlers: {
        onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
        onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void
        onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void
        onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void
    }
}

/** Visual lift while a sprite is held, echoing the same "picked up" read as PettableCharacter's boop-squish, just via scale instead of the squish keyframe (which is reserved for the drop reaction, not the pickup). */
const DRAG_SCALE = 1.08
const SNAP_BACK_TRANSITION = 'transform 260ms var(--ease-settle, cubic-bezier(0.34, 1.56, 0.64, 1))'

/**
 * useDraggableSprite — turns pointer-down-move-up on any element into a
 * "pick it up, follow the pointer, hit-test on release" gesture.
 *
 * This is the same pointer-capture + ref-tracked-delta technique
 * `usePetting` already uses for stroke detection, generalized from
 * "does this look like a pet stroke" to "where did the pointer end up
 * relative to a target rect" — no drag-and-drop library pulled in for
 * either the food/toy tray (this sprint) or room furniture placement
 * (next), because neither needs anything more than pointer events and
 * a bounding-rect check.
 *
 * Deliberately unopinionated about WHAT a hit means: dropping a food
 * item onto Mochi and dropping a cushion onto the room floor are both
 * just "did the release point land inside this element's rect" from
 * this hook's point of view. Callers own the meaning of a hit
 * (feed vs. play vs. PATCH a new x/y) via their own `onDrop`.
 */
export function useDraggableSprite({
    dropZoneRef,
    onDrop,
    disabled = false,
    onDragMove,
    onDragEnd,
}: UseDraggableSpriteOptions): UseDraggableSpriteResult {
    const [isDragging, setIsDragging] = useState(false)
    const [offset, setOffset] = useState({ x: 0, y: 0 })

    const startPointRef = useRef<{ x: number; y: number } | null>(null)
    const draggingRef = useRef(false)

    const onPointerDown = useCallback(
        (event: ReactPointerEvent<HTMLElement>) => {
            if (disabled) return
            draggingRef.current = true
            setIsDragging(true)
            startPointRef.current = { x: event.clientX, y: event.clientY }
            setOffset({ x: 0, y: 0 })
            // Keep receiving moves even if the pointer wanders off the element mid-drag.
            event.currentTarget.setPointerCapture?.(event.pointerId)
        },
        [disabled],
    )

    const onPointerMove = useCallback(
        (event: ReactPointerEvent<HTMLElement>) => {
            if (!draggingRef.current || !startPointRef.current) return
            setOffset({
                x: event.clientX - startPointRef.current.x,
                y: event.clientY - startPointRef.current.y,
            })
            onDragMove?.(event.clientX, event.clientY)
        },
        [onDragMove],
    )

    const endDrag = useCallback(
        (event: ReactPointerEvent<HTMLElement>, { fireDrop }: { fireDrop: boolean }) => {
            if (!draggingRef.current) return

            // Captured FIRST, synchronously, off the still-dragged DOM
            // position — React batches the setOffset below, so the
            // element hasn't snapped back yet when this reads.
            const domRect = event.currentTarget.getBoundingClientRect()

            draggingRef.current = false
            setIsDragging(false)
            setOffset({ x: 0, y: 0 }) // triggers the snap-back transition, since isDragging just flipped false
            onDragEnd?.()

            if (fireDrop) {
                const dropZone = dropZoneRef.current
                let hit = false
                if (dropZone) {
                    const rect = dropZone.getBoundingClientRect()
                    hit =
                        event.clientX >= rect.left &&
                        event.clientX <= rect.right &&
                        event.clientY >= rect.top &&
                        event.clientY <= rect.bottom
                }
                onDrop({
                    hit,
                    clientX: event.clientX,
                    clientY: event.clientY,
                    rect: {
                        left: domRect.left,
                        top: domRect.top,
                        right: domRect.right,
                        bottom: domRect.bottom,
                        width: domRect.width,
                        height: domRect.height,
                    },
                })
            }

            startPointRef.current = null
        },
        [dropZoneRef, onDrop, onDragEnd],
    )

    const onPointerUp = useCallback(
        (event: ReactPointerEvent<HTMLElement>) => endDrag(event, { fireDrop: true }),
        [endDrag],
    )

    // A cancelled gesture (browser-initiated, e.g. a system gesture taking
    // over mid-drag) resets the sprite without treating it as a deliberate
    // release — see onDrop's doc comment for why this never fires it.
    const onPointerCancel = useCallback(
        (event: ReactPointerEvent<HTMLElement>) => endDrag(event, { fireDrop: false }),
        [endDrag],
    )

    const dragStyle: CSSProperties = {
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${isDragging ? DRAG_SCALE : 1})`,
        transition: isDragging ? 'none' : SNAP_BACK_TRANSITION,
        touchAction: 'none',
        zIndex: isDragging ? 60 : undefined,
        cursor: disabled ? 'default' : isDragging ? 'grabbing' : 'grab',
    }

    return {
        isDragging,
        dragStyle,
        handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    }
}
