package com.mochi.mochibackend.item.enums;

/**
 * Which side of Mochi a placed item renders on. This is the data-driven
 * equivalent of the room's existing static layer split (RoomDepthLayer /
 * RoomMiddleLayer / RoomForegroundLayer): {@code PlacedFurnitureLayer}
 * reads this field to decide whether an item's sprite draws before or
 * after Mochi's own Rive layer, instead of that being fixed by which
 * file a sprite happened to live in.
 */
public enum ItemLayer {
    BEHIND_MOCHI,
    IN_FRONT_OF_MOCHI
}
