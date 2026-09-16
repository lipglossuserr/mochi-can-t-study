package com.mochi.mochibackend.exception;

/**
 * Thrown when POST /api/inventory/{id}/consume targets an inventory
 * entry whose item isn't FOOD (e.g. a chair). Maps to 400 — the
 * request itself is malformed for this endpoint, not a missing
 * resource or a conflict.
 */
public class InventoryItemNotFoodException extends RuntimeException {

    public InventoryItemNotFoodException(String message) {
        super(message);
    }
}