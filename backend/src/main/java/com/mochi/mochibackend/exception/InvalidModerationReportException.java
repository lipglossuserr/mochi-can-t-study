package com.mochi.mochibackend.exception;

/** Thrown by {@code RoomModerationService#reportParticipant} for a report that's malformed on its face — e.g. someone reporting themselves — as opposed to {@link LiveKitAdminCallException}, which covers LiveKit itself rejecting a call. */
public class InvalidModerationReportException extends RuntimeException {

    public InvalidModerationReportException(String message) {
        super(message);
    }
}
