package com.mochi.mochibackend.roomlayout.dto;

import com.mochi.mochibackend.item.dto.ItemResponse;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Public view of one placed item. {@code item} is embedded directly
 * (rather than just an id) so {@code PlacedFurnitureLayer} can render a
 * sprite from a single {@code GET /api/room-layout} call — no per-item
 * follow-up fetch to resolve artwork/layer.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RoomLayoutResponse {

    private Long id;
    private Long inventoryEntryId;
    private ItemResponse item;
    private double x;
    private double y;
    private int zIndex;
    private Double rotation;
    private Instant placedAt;
    private Instant updatedAt;
}
