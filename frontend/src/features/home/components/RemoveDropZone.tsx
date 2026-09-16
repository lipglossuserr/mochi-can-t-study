import { forwardRef } from 'react'

interface RemoveDropZoneProps {
    /** True while a placed decor item is actively being dragged — the only time removal is even possible, so the zone stays out of the way otherwise. */
    active: boolean
}

/**
 * RemoveDropZone
 *
 * A drag target for un-placing a room item. PlacedFurnitureLayer hit-
 * tests the release point against this element's own rect (see its
 * onDrop handler + roomCollision's isPointInRect) — the same
 * "getBoundingClientRect + point-in-rect" check useDraggableSprite
 * already does for the room itself, just aimed at this instead.
 * Fixed to the viewport so it's reachable no matter where in the room
 * the dragged item started, and only visible while something is
 * actually being dragged, so it never competes for attention the rest
 * of the time.
 */
const RemoveDropZone = forwardRef<HTMLDivElement, RemoveDropZoneProps>(function RemoveDropZone(
    { active },
    ref,
) {
    return (
        <div
            ref={ref}
            aria-hidden={!active}
            className={`pointer-events-none fixed bottom-6 left-1/2 z-[70] flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full border-2 border-dashed border-white/70 bg-ink/70 text-2xl shadow-xl backdrop-blur-md transition-all duration-200 sm:h-20 sm:w-20 ${
                active ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
        >
            🗑️
        </div>
    )
})

export default RemoveDropZone