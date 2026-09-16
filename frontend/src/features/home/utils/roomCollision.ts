export interface EdgeRect {
    left: number
    top: number
    right: number
    bottom: number
}

function overlaps(a: EdgeRect, b: EdgeRect): boolean {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

function isFullyInside(inner: EdgeRect, outer: EdgeRect): boolean {
    return inner.left >= outer.left && inner.right <= outer.right && inner.top >= outer.top && inner.bottom <= outer.bottom
}


/**
 * Validates a room-item placement/reposition against RoomScene's own
 * bounds and every OTHER currently placed item, using live DOM
 * bounding rects (from `getBoundingClientRect()`) rather than trusting
 * arbitrary grid coordinates. Placed items are found via
 * `[data-room-item-id]`, set on each sprite in PlacedFurnitureLayer —
 * querying from `roomEl` (RoomScene's own root) picks up both the
 * behind and in-front layers in one pass, since both are DOM
 * descendants of that same root.
 *
 * `excludeId` is the id of the item being moved itself (a reposition
 * drag) so a placed item never collides with its own previous spot.
 */
export function isValidRoomPlacement(roomEl: HTMLElement, draggedRect: EdgeRect, excludeId?: number): boolean {
    const roomRect = roomEl.getBoundingClientRect()
    if (!isFullyInside(draggedRect, roomRect)) return false

    const placedElements = roomEl.querySelectorAll<HTMLElement>('[data-room-item-id]')
    for (const element of Array.from(placedElements)) {
        const id = Number(element.dataset.roomItemId)
        if (excludeId !== undefined && id === excludeId) continue
        if (overlaps(draggedRect, element.getBoundingClientRect())) return false
    }
    return true
}

/**
 * The lenient sibling of `isValidRoomPlacement` — checks ONLY for a
 * genuine overlap with another already-placed item, with no "must be
 * 100% inside the room" requirement. Used for drag-to-reposition
 * (PlacedFurnitureLayer) and drag-to-place (InventoryTray), where the
 * resting x/y is always computed by CLAMPING the drop point into the
 * room's bounds first — so the item's *center* is guaranteed to land
 * inside the room regardless of this check. Rejecting on the stricter
 * full-containment test caused a real bug: a drag that ended a few
 * pixels past an edge (extremely easy to do near the room's rounded
 * corners) silently snapped the item back to its old spot with no
 * feedback, making it look "stuck." This only blocks the one case
 * that actually matters — dropping directly on top of something else.
 */
export function overlapsAnyOtherItem(roomEl: HTMLElement, draggedRect: EdgeRect, excludeId?: number): boolean {
    const placedElements = roomEl.querySelectorAll<HTMLElement>('[data-room-item-id]')
    for (const element of Array.from(placedElements)) {
        const id = Number(element.dataset.roomItemId)
        if (excludeId !== undefined && id === excludeId) continue
        if (overlaps(draggedRect, element.getBoundingClientRect())) return true
    }
    return false
}

/**
 * Whether a point (release coordinates) falls inside an element's live
 * bounding rect. Same math useDraggableSprite's own drop-zone hit test
 * already does internally — exposed here so a dragged room item can
 * also be checked against a SECOND target, the remove zone, which
 * useDraggableSprite itself only ever tracks one of.
 */
export function isPointInRect(clientX: number, clientY: number, element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect()
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
}