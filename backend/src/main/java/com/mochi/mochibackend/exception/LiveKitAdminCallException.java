package com.mochi.mochibackend.exception;

/** Thrown when a call to LiveKit's Twirp Room Service API fails or is unreachable. Maps to 502 (this backend acted as a gateway to LiveKit and that call failed). */
public class LiveKitAdminCallException extends RuntimeException {

    public LiveKitAdminCallException(String message) {
        super(message);
    }

    public LiveKitAdminCallException(String message, Throwable cause) {
        super(message, cause);
    }
}
