package com.mochi.mochibackend.video.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mochi.mochibackend.exception.VideoNotConfiguredException;
import com.mochi.mochibackend.video.config.LiveKitProperties;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Issues LiveKit room-access tokens — Study Rooms Phase 3.
 * <p>
 * LiveKit access tokens are plain HS256 JWTs signed with the project's
 * API secret (see LiveKit's server SDKs for the equivalent in other
 * languages — the claim shape here is the same one they all produce).
 * We hand-roll the three-part JWT with {@link ObjectMapper} (already a
 * transitive dependency via {@code spring-boot-starter-web}) and
 * {@code javax.crypto.Mac} rather than pulling in the
 * {@code livekit-server-sdk} artifact — one fewer dependency to manage
 * for a token shape that's a small, stable spec.
 * <p>
 * The API secret never leaves this class: only the signed token and the
 * public {@code wsUrl} are returned to callers.
 */
@Service
public class LiveKitTokenService {

    private static final String ALGORITHM = "HmacSHA256";
    /** Token lifetime — generous enough to cover a full room session without needing a refresh flow yet. */
    private static final long TTL_SECONDS = 6 * 60 * 60;

    private final LiveKitProperties properties;
    private final ObjectMapper objectMapper;

    public LiveKitTokenService(LiveKitProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    /**
     * Builds a room-join token scoped to exactly one LiveKit room and one
     * participant identity. {@code roomName} should already be namespaced
     * by the caller (see {@code LiveKitRoomNaming}) — this method doesn't
     * add any prefix itself, so two different callers passing the same
     * raw Firestore room id would collide if neither namespaced it.
     */
    public String createJoinToken(String roomName, String identity, String displayName) {
        if (!properties.isConfigured()) {
            throw new VideoNotConfiguredException(
                    "Video isn't configured on this deployment yet (missing LiveKit credentials).");
        }

        long now = Instant.now().getEpochSecond();

        Map<String, Object> videoGrant = new LinkedHashMap<>();
        videoGrant.put("room", roomName);
        videoGrant.put("roomJoin", true);
        videoGrant.put("canPublish", true);
        videoGrant.put("canSubscribe", true);
        videoGrant.put("canPublishData", true);

        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("iss", properties.getApiKey());
        claims.put("sub", identity);
        claims.put("name", displayName);
        claims.put("nbf", now);
        claims.put("exp", now + TTL_SECONDS);
        claims.put("jti", UUID.randomUUID().toString());
        claims.put("video", videoGrant);

        return sign(claims);
    }

    public String getWsUrl() {
        return properties.getWsUrl();
    }

    /**
     * Admin-grant token for server-to-LiveKit calls (moderation actions —
     * see {@code RoomModerationService}). Never sent to a client, unlike
     * {@link #createJoinToken}'s output — this grant can remove or mute
     * any participant in the room, so it's used exactly once per admin
     * HTTP call and discarded, never cached or returned from a
     * controller.
     */
    public String createAdminToken(String roomName) {
        if (!properties.isConfigured()) {
            throw new VideoNotConfiguredException(
                    "Video isn't configured on this deployment yet (missing LiveKit credentials).");
        }

        long now = Instant.now().getEpochSecond();

        Map<String, Object> videoGrant = new LinkedHashMap<>();
        videoGrant.put("room", roomName);
        videoGrant.put("roomAdmin", true);

        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("iss", properties.getApiKey());
        claims.put("sub", "mochi-backend");
        claims.put("nbf", now);
        // Deliberately much shorter-lived than a participant join token
        // (TTL_SECONDS, 6h) — this grant is powerful and only needed for
        // the few seconds a single admin HTTP call takes.
        claims.put("exp", now + 60);
        claims.put("jti", UUID.randomUUID().toString());
        claims.put("video", videoGrant);

        return sign(claims);
    }

    public String getHttpUrl() {
        return properties.getHttpUrl();
    }

    private String sign(Map<String, Object> claims) {
        try {
            Map<String, Object> header = Map.of("alg", "HS256", "typ", "JWT");

            String encodedHeader = base64UrlEncode(objectMapper.writeValueAsBytes(header));
            String encodedClaims = base64UrlEncode(objectMapper.writeValueAsBytes(claims));
            String signingInput = encodedHeader + "." + encodedClaims;

            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(new SecretKeySpec(properties.getApiSecret().getBytes(StandardCharsets.UTF_8), ALGORITHM));
            String signature = base64UrlEncode(mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8)));

            return signingInput + "." + signature;
        } catch (Exception e) {
            // Only reachable via a JDK/algorithm misconfiguration, not caller input —
            // wrapped unchecked the same way FirestoreOperationException wraps its checked causes.
            throw new IllegalStateException("Failed to sign LiveKit access token", e);
        }
    }

    private static String base64UrlEncode(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
