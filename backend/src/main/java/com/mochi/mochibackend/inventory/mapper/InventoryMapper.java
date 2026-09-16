package com.mochi.mochibackend.inventory.mapper;

import com.mochi.mochibackend.inventory.dto.InventoryEntryResponse;
import com.mochi.mochibackend.inventory.entity.InventoryEntry;
import com.mochi.mochibackend.item.mapper.ItemMapper;
import org.springframework.stereotype.Component;

/**
 * Entity -> DTO mapping. Entities are never exposed from controllers.
 * Placement status is not on the entity itself (see {@code InventoryEntry}'s
 * doc comment), so it's passed in by the caller ({@code InventoryService}),
 * which is the one place that already knows how to look it up.
 */
@Component
public class InventoryMapper {

    private final ItemMapper itemMapper;

    public InventoryMapper(ItemMapper itemMapper) {
        this.itemMapper = itemMapper;
    }

    public InventoryEntryResponse toResponse(InventoryEntry entry, Long roomLayoutEntryId) {
        return new InventoryEntryResponse(
                entry.getId(),
                itemMapper.toResponse(entry.getItem()),
                entry.getAcquiredAt(),
                roomLayoutEntryId != null,
                roomLayoutEntryId
        );
    }
}
