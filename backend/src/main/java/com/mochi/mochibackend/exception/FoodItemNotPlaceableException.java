package com.mochi.mochibackend.exception;

/**
 * Thrown when POST /api/room-layout targets an inventory entry whose
 * item is FOOD — food has no `layer` and is never placed in the room
 * (it's consumed via POST /api/inventory/{id}/consume instead). Maps
 * to 400. The frontend never triggers this in normal use (the Decor
 * tray only ever lists FURNITURE/TOY/DECORATION), but the backend
 * stays the authoritative check rather than trusting the client to
 * simply not send it.
 */
public class FoodItemNotPlaceableException extends RuntimeException {

    public FoodItemNotPlaceableException(String message) {
        super(message);
    }
}