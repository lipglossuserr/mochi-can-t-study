package com.mochi.mochibackend.exception;

/**
 * Thrown when a room-layout placement references an
 * {@code inventoryEntryId} that either doesn't exist or doesn't belong
 * to the caller — the same "another user's id looks like not found"
 * treatment {@code DailyGoalNotFoundException} gives daily goals. Maps
 * to 404.
 */
public class InventoryEntryNotFoundException extends RuntimeException {

    public InventoryEntryNotFoundException(String message) {
        super(message);
    }
}
