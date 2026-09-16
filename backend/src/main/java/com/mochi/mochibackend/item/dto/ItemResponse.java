package com.mochi.mochibackend.item.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Public view of a catalog item. Entities are never exposed from
 * controllers — every response goes through {@code ItemMapper}.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ItemResponse {

    private Long id;
    private String itemKey;
    private String name;
    private String description;
    private String category;
    private int price;
    private String layer;
    private String imagePath;
    private String fallbackEmoji;
}
