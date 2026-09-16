package com.mochi.mochibackend.roomlayout.mapper;

import com.mochi.mochibackend.item.mapper.ItemMapper;
import com.mochi.mochibackend.roomlayout.dto.RoomLayoutResponse;
import com.mochi.mochibackend.roomlayout.entity.RoomLayoutEntry;
import org.springframework.stereotype.Component;

/**
 * Entity -> DTO mapping. Entities are never exposed from controllers.
 */
@Component
public class RoomLayoutMapper {

    private final ItemMapper itemMapper;

    public RoomLayoutMapper(ItemMapper itemMapper) {
        this.itemMapper = itemMapper;
    }

    public RoomLayoutResponse toResponse(RoomLayoutEntry entry) {
        return new RoomLayoutResponse(
                entry.getId(),
                entry.getInventoryEntry().getId(),
                itemMapper.toResponse(entry.getInventoryEntry().getItem()),
                entry.getX(),
                entry.getY(),
                entry.getZIndex(),
                entry.getRotation(),
                entry.getPlacedAt(),
                entry.getUpdatedAt()
        );
    }
}
