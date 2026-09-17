package com.mochi.mochibackend.item.enums;

/**
 * What kind of shop item this is.
 * <p>
 * FOOD flows through the same secure backend purchase
 * (ShopService.purchase) + inventory (InventoryEntry) pipeline as
 * furniture/toys/decorations, instead of an immediate-spend-and-feed
 * shortcut. The actual "eat it" step is a separate action — see
 * InventoryService#consumeFood, fired by POST /api/inventory/{id}/consume
 * once a food entry is dragged onto Mochi from the Home Feed tray.
 * <p>
 * SKIN is a pet appearance/coat unlock (Shop v1.1) — not placed in the
 * room either, so {@code Item.layer} is null for these too (see that
 * field's doc comment). Owning one via
 * {@link com.mochi.mochibackend.inventory.entity.InventoryEntry} is
 * what lets {@code PetService.equipSkin} accept it.
 * <p>
 * Neither FOOD nor SKIN is placeable in the room — see
 * {@code RoomLayoutService#create}'s category guard, which rejects both.
 */
public enum ItemCategory {
    FURNITURE,
    TOY,
    DECORATION,
    FOOD,
    SKIN
}
