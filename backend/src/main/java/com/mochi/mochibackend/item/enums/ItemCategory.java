package com.mochi.mochibackend.item.enums;

/**
 * What kind of shop item this is. FOOD now flows through the same
 * secure backend purchase (ShopService.purchase) + inventory
 * (InventoryEntry) pipeline as furniture/toys/decorations, instead of
 * the old immediate-spend-and-feed shortcut. The actual "eat it" step
 * is a separate action — see InventoryService#consumeFood, fired by
 * POST /api/inventory/{id}/consume once a food entry is dragged onto
 * Mochi from the Home Feed tray.
 */
public enum ItemCategory {
    FURNITURE,
    TOY,
    DECORATION,
    FOOD,
    SKIN
}