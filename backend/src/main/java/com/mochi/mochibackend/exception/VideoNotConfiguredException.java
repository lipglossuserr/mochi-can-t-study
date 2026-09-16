package com.mochi.mochibackend.exception;

/**
 * Thrown when a video-token is requested but {@code livekit.api-key} /
 * {@code livekit.api-secret} / {@code livekit.ws-url} aren't all set —
 * Study Rooms Phase 3. Maps to 503: this isn't a bad request, the
 * *feature* isn't available yet on this deployment (e.g. local dev
 * before a LiveKit Cloud project exists). Distinct from
 * {@link InvalidFirebaseTokenException} so the frontend can tell "you're
 * not allowed" apart from "video isn't set up here" and degrade the UI
 * accordingly (hide the camera button vs. prompt to sign in).
 */
public class VideoNotConfiguredException extends RuntimeException {

    public VideoNotConfiguredException(String message) {
        super(message);
    }
}
