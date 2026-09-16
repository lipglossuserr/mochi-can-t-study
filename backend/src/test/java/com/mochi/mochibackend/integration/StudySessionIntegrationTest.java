package com.mochi.mochibackend.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.FirebaseToken;
import com.mochi.mochibackend.firebase.FirebaseTokenVerifier;
import com.mochi.mochibackend.repository.FocusBatchRepository;
import com.mochi.mochibackend.repository.StudySessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Full-stack HTTP tests over an in-memory H2 database. Firebase is mocked:
 * FirebaseApp so the context boots without a service-account file, and
 * FirebaseTokenVerifier so "Bearer user-a-token" resolves to a fake user.
 */
@SpringBootTest
@AutoConfigureMockMvc
class StudySessionIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private StudySessionRepository sessionRepository;

    @Autowired
    private FocusBatchRepository batchRepository;

    @MockitoBean
    private FirebaseApp firebaseApp;

    @MockitoBean
    private FirebaseTokenVerifier firebaseTokenVerifier;

    @BeforeEach
    void setUp() throws Exception {
        batchRepository.deleteAll();
        sessionRepository.deleteAll();

        Mockito.when(firebaseTokenVerifier.verify(anyString())).thenAnswer(invocation -> {
            String token = invocation.getArgument(0);
            FirebaseToken decoded = Mockito.mock(FirebaseToken.class);
            // "user-a-token" -> uid "user-a", "user-b-token" -> uid "user-b"
            String uid = token.replace("-token", "");
            Mockito.when(decoded.getUid()).thenReturn(uid);
            Mockito.when(decoded.getEmail()).thenReturn(uid + "@test.local");
            return decoded;
        });
    }

    private String auth(String user) {
        return "Bearer " + user + "-token";
    }

    // ---------- authentication ----------

    @Test
    void requestsWithoutTokenAreRejectedWith401() throws Exception {
        mockMvc.perform(get("/api/study-sessions/active"))
                .andExpect(status().isUnauthorized());
    }

    // ---------- lifecycle ----------

    @Test
    void fullLifecycleStartPauseResumeComplete() throws Exception {
        long id = startSession("user-a", 5);

        mockMvc.perform(post("/api/study-sessions/" + id + "/pause")
                        .header("Authorization", auth("user-a")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PAUSED"));

        mockMvc.perform(post("/api/study-sessions/" + id + "/resume")
                        .header("Authorization", auth("user-a")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("RUNNING"));

        mockMvc.perform(post("/api/study-sessions/" + id + "/complete")
                        .header("Authorization", auth("user-a")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.sessionClassification").isNotEmpty());
    }

    @Test
    void startRejectsDurationBelowFiveMinutes() throws Exception {
        mockMvc.perform(post("/api/study-sessions/start")
                        .header("Authorization", auth("user-a"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"plannedDurationMinutes\": 3}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void secondActiveSessionIsRejectedWith409() throws Exception {
        startSession("user-a", 5);

        mockMvc.perform(post("/api/study-sessions/start")
                        .header("Authorization", auth("user-a"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"plannedDurationMinutes\": 10}"))
                .andExpect(status().isConflict());
    }

    @Test
    void refreshRecoveryFindsTheActiveSession() throws Exception {
        long id = startSession("user-a", 5);

        mockMvc.perform(get("/api/study-sessions/active")
                        .header("Authorization", auth("user-a")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(id))
                .andExpect(jsonPath("$.data.status").value("RUNNING"))
                .andExpect(jsonPath("$.data.remainingSeconds").isNumber());
    }

    @Test
    void duplicateCompleteRequestsAreIdempotent() throws Exception {
        long id = startSession("user-a", 5);

        mockMvc.perform(post("/api/study-sessions/" + id + "/complete")
                        .header("Authorization", auth("user-a")))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/study-sessions/" + id + "/complete")
                        .header("Authorization", auth("user-a")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));
    }

    // ---------- ownership ----------

    @Test
    void anotherUsersSessionBehavesAsNotFound() throws Exception {
        long id = startSession("user-a", 5);

        mockMvc.perform(post("/api/study-sessions/" + id + "/pause")
                        .header("Authorization", auth("user-b")))
                .andExpect(status().isNotFound());
    }

    // ---------- focus batches ----------

    @Test
    void duplicateFocusBatchesAreNotCountedTwice() throws Exception {
        long id = startSession("user-a", 5);

        String batch = """
                {
                  "clientBatchId": "batch-1",
                  "windowStartedAt": "%s",
                  "windowEndedAt": "%s",
                  "focusedMilliseconds": 10000,
                  "distractedMilliseconds": 2000,
                  "noFaceMilliseconds": 0,
                  "multipleFaceMilliseconds": 0,
                  "cameraUnavailableMilliseconds": 0
                }
                """.formatted(
                java.time.Instant.now().minusSeconds(15),
                java.time.Instant.now());

        mockMvc.perform(post("/api/study-sessions/" + id + "/focus-batches")
                        .header("Authorization", auth("user-a"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(batch))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accepted").value(true));

        mockMvc.perform(post("/api/study-sessions/" + id + "/focus-batches")
                        .header("Authorization", auth("user-a"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(batch))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.duplicate").value(true));

        var session = sessionRepository.findById(id).orElseThrow();
        assertThat(session.getFocusedSeconds()).isEqualTo(10); // counted once
    }

    @Test
    void negativeFocusValuesAreRejected() throws Exception {
        long id = startSession("user-a", 5);

        String batch = """
                {
                  "clientBatchId": "batch-neg",
                  "windowStartedAt": "%s",
                  "windowEndedAt": "%s",
                  "focusedMilliseconds": -5
                }
                """.formatted(
                java.time.Instant.now().minusSeconds(15),
                java.time.Instant.now());

        mockMvc.perform(post("/api/study-sessions/" + id + "/focus-batches")
                        .header("Authorization", auth("user-a"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(batch))
                .andExpect(status().isBadRequest());
    }

    // ---------- helper ----------

    private long startSession(String user, int minutes) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/study-sessions/start")
                        .header("Authorization", auth(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"plannedDurationMinutes\": " + minutes + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("RUNNING"))
                .andReturn();

        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return body.get("data").get("id").asLong();
    }
}
