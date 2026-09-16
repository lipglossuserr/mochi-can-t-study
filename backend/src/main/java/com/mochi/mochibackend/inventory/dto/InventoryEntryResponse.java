package com.mochi.mochibackend.inventory.dto;

import com.mochi.mochibackend.item.dto.ItemResponse;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Public view of one owned item. {@code placed}/{@code roomLayoutEntryId}
 * let the frontend split a user's inventory into "tray" (unplaced) vs.
 * "already in the room" without a second round trip per item — the tray
 * UI is simply every entry where {@code placed} is false. Full placement
 * details (x, y, zIndex, rotation) live on {@code RoomLayoutResponse};
 * fetch {@code GET /api/room-layout} for those once an id is known here.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InventoryEntryResponse {

    private Long id;
    private ItemResponse item;
    private Instant acquiredAt;
    private boolean placed;
    private Long roomLayoutEntryId;
}
