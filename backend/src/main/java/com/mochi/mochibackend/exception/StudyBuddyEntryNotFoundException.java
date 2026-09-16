package com.mochi.mochibackend.exception;

/** Thrown by {@code GET /api/study-buddy/queue} when the caller has no WAITING/MATCHED entry — "not in the queue," not a server error. */
public class StudyBuddyEntryNotFoundException extends RuntimeException {

    public StudyBuddyEntryNotFoundException(String message) {
        super(message);
    }
}
