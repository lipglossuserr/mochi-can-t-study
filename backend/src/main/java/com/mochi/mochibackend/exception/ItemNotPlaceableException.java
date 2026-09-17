package com.mochi.mochibackend.exception;

/**
 * Thrown when POST /api/room-layout targets an inventory entry whose
 * item is FOOD or SKIN — neither has a `layer` and neither is ever
 * placed in the room (FOOD is consumed via
 * POST /api/inventory/{id}/consume; SKIN is equipped onto the pet via
 * PATCH /api/pet/skin). Maps to 400. The frontend never triggers this
 * in normal use (the Decor tray only ever lists
 * FURNITURE/TOY/DECORATION), but the backend stays the authoritative
 * check rather than trusting the client to simply not send it.
 * <p>
 * Named generically (not FoodItemNotPlaceableException) since two
 * unrelated non-placeable categories now share this guard — see
 * RoomLayoutService#create.
 */
public class ItemNotPlaceableException extends RuntimeException {

    public ItemNotPlaceableException(String message) {
        super(message);
    }
}
