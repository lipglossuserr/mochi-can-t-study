package com.mochi.mochibackend.exception;

/** Thrown when a moderation action (remove/mute participant) is attempted by someone who isn't the room's host. Maps to 403. */
public class NotRoomHostException extends RuntimeException {

    public NotRoomHostException(String message) {
        super(message);
    }
}
