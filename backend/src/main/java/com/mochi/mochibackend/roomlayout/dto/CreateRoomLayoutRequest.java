package com.mochi.mochibackend.roomlayout.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * Request payload for {@code POST /api/room-layout} — the first drop of
 * an owned-but-unplaced item from the inventory tray onto the room
 * floor/wall. {@code inventoryEntryId} must belong to the caller (see
 * {@code InventoryService.requireOwnedEntry}) and must not already have
 * a placement (see {@code ItemAlreadyPlacedException}) — re-dragging an
 * already-placed item goes through {@code PATCH /api/room-layout/{id}}
 * instead, never back through this endpoint.
 */
@Getter
@Setter
public class CreateRoomLayoutRequest {

    @NotNull(message = "Inventory entry id is required")
    private Long inventoryEntryId;

    @NotNull(message = "x is required")
    private Double x;

    @NotNull(message = "y is required")
    private Double y;

    /** Optional; defaults to 0 (bottom of the stack within its layer) when omitted. */
    private Integer zIndex;

    /** Optional; most furniture won't rotate in v1. */
    private Double rotation;
}
