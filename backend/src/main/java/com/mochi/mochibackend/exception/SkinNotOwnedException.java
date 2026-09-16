package com.mochi.mochibackend.exception;

/**
 * Thrown when {@code PATCH /api/pet/skin} targets a SKIN item the
 * caller doesn't own an {@link com.mochi.mochibackend.inventory.entity.InventoryEntry}
 * for. Maps to 403 — the item exists (it's a real catalog id), the
 * caller is just not allowed to equip it yet; that's a permissions
 * problem, not a missing-resource one, same distinction
 * {@link NotRoomHostException} draws for its own 403.
 */
public class SkinNotOwnedException extends RuntimeException {

    public SkinNotOwnedException(String message) {
        super(message);
    }
}
