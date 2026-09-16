package com.mochi.mochibackend.video.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * LiveKit Cloud (or self-hosted) project credentials — Study Rooms
 * Phase 3. Bound from {@code livekit.api-key} / {@code livekit.api-secret}
 * / {@code livekit.ws-url}, each backed by an env var so the actual
 * secret never lives in a committed properties file (same convention as
 * {@code firebase.credentials.path} pointing at a gitignored file rather
 * than embedding Firebase creds directly).
 * <p>
 * {@code apiSecret} signs every access token issued by
 * {@link com.mochi.mochibackend.video.service.LiveKitTokenService} — it
 * must never be sent to a client. {@code wsUrl} is the opposite: it's
 * public by design (the frontend's {@code livekit-client} SDK connects
 * to it directly), so it's fine to include in the token-issuing response.
 */
@Component
public class LiveKitProperties {

    private final String apiKey;
    private final String apiSecret;
    private final String wsUrl;

    public LiveKitProperties(
            @Value("${livekit.api-key:}") String apiKey,
            @Value("${livekit.api-secret:}") String apiSecret,
            @Value("${livekit.ws-url:}") String wsUrl
    ) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.wsUrl = wsUrl;
    }

    public String getApiKey() {
        return apiKey;
    }

    public String getApiSecret() {
        return apiSecret;
    }

    public String getWsUrl() {
        return wsUrl;
    }

    /**
     * LiveKit's HTTP(S) Server API (Twirp) shares the same host as the
     * WebSocket media URL, just a different scheme — this is a documented
     * LiveKit convention, not a guess specific to this deployment.
     * Used only server-side for moderation actions (RoomModerationService);
     * never returned to a client, unlike {@link #getWsUrl}.
     */
    public String getHttpUrl() {
        if (wsUrl.startsWith("wss://")) {
            return "https://" + wsUrl.substring("wss://".length());
        }
        if (wsUrl.startsWith("ws://")) {
            return "http://" + wsUrl.substring("ws://".length());
        }
        return wsUrl;
    }

    /** True once all three values are set — lets the service fail fast with a clear error instead of an obscure signing exception. */
    public boolean isConfigured() {
        return !apiKey.isBlank() && !apiSecret.isBlank() && !wsUrl.isBlank();
    }
}
