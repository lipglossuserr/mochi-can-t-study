package com.mochi.mochibackend.exception;

/** Thrown when a moderation action targets a Firestore co-study room id that doesn't exist. Maps to 404. */
public class CoStudyRoomNotFoundException extends RuntimeException {

    public CoStudyRoomNotFoundException(String message) {
        super(message);
    }
}
