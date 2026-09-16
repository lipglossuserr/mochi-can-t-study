package com.mochi.mochibackend.video.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mochi.mochibackend.exception.VideoNotConfiguredException;
import com.mochi.mochibackend.video.config.LiveKitProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Verifies the hand-rolled LiveKit JWT (Study Rooms Phase 3) is
 * structurally correct — three base64url segments, the expected video
 * grant, and a signature that actually verifies against the configured
 * secret — without needing the real livekit-server-sdk or a live
 * LiveKit project.
 */
class LiveKitTokenServiceTest {

    private static final String API_KEY = "test-api-key";
    private static final String API_SECRET = "test-api-secret-value";
    private static final String WS_URL = "wss://example.livekit.cloud";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private LiveKitTokenService service;

    @BeforeEach
    void setUp() {
        LiveKitProperties properties = new LiveKitProperties(API_KEY, API_SECRET, WS_URL);
        service = new LiveKitTokenService(properties, objectMapper);
    }

    @Test
    void createJoinToken_producesThreeSegmentJwtWithExpectedClaims() throws Exception {
        String token = service.createJoinToken("costudy-room1", "uid-123", "Alex");

        String[] segments = token.split("\\.");
        assertThat(segments).hasSize(3);

        JsonNode header = decodeSegment(segments[0]);
        assertThat(header.get("alg").asText()).isEqualTo("HS256");

        JsonNode claims = decodeSegment(segments[1]);
        assertThat(claims.get("iss").asText()).isEqualTo(API_KEY);
        assertThat(claims.get("sub").asText()).isEqualTo("uid-123");
        assertThat(claims.get("name").asText()).isEqualTo("Alex");
        assertThat(claims.get("video").get("room").asText()).isEqualTo("costudy-room1");
        assertThat(claims.get("video").get("roomJoin").asBoolean()).isTrue();
        assertThat(claims.get("exp").asLong()).isGreaterThan(claims.get("nbf").asLong());
    }

    @Test
    void createJoinToken_signatureVerifiesAgainstConfiguredSecret() throws Exception {
        String token = service.createJoinToken("costudy-room1", "uid-123", "Alex");
        String[] segments = token.split("\\.");
        String signingInput = segments[0] + "." + segments[1];

        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(API_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String expectedSignature = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8)));

        assertThat(segments[2]).isEqualTo(expectedSignature);
    }

    @Test
    void createJoinToken_throwsWhenNotConfigured() {
        LiveKitProperties unconfigured = new LiveKitProperties("", "", "");
        LiveKitTokenService unconfiguredService = new LiveKitTokenService(unconfigured, objectMapper);

        assertThatThrownBy(() -> unconfiguredService.createJoinToken("costudy-room1", "uid-123", "Alex"))
                .isInstanceOf(VideoNotConfiguredException.class);
    }

    @Test
    void getWsUrl_returnsConfiguredUrl() {
        assertThat(service.getWsUrl()).isEqualTo(WS_URL);
    }

    private JsonNode decodeSegment(String segment) throws Exception {
        byte[] decoded = Base64.getUrlDecoder().decode(segment);
        return objectMapper.readTree(decoded);
    }
}
