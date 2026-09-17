package com.mochi.mochibackend.item.mapper;

import com.mochi.mochibackend.item.dto.ItemResponse;
import com.mochi.mochibackend.item.entity.Item;
import org.springframework.stereotype.Component;

/**
 * Entity -> DTO mapping. Entities are never exposed from controllers.
 */
@Component
public class ItemMapper {

    public ItemResponse toResponse(Item item) {
        return new ItemResponse(
                item.getId(),
                item.getItemKey(),
                item.getName(),
                item.getDescription(),
                item.getCategory().name(),
                item.getPrice(),
                item.getLayer() != null ? item.getLayer().name() : null,
                item.getImagePath(),
                item.getFallbackEmoji()
        );
    }
}
