package com.mochi.mochibackend.community.controller;

import com.mochi.mochibackend.community.service.CounterReconciliationService;
import com.mochi.mochibackend.dto.ApiResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * A manual trigger for {@code CounterReconciliationService} — v2
 * backlog, closing the gap left when that service shipped with only a
 * scheduled 3am run (see its javadoc). Deliberately not gated by
 * Firebase auth or a per-community role: this app has no site-wide
 * admin concept, only per-community MEMBER/MODERATOR/ADMIN, and none
 * of those is the right fit for "trigger a global maintenance job that
 * touches every community." Building a whole site-admin auth layer
 * just to expose one button would be disproportionate to what this
 * endpoint needs — so it's gated by a shared secret instead
 * ({@code mochi.ops.reconciliation-key}), the same proportionate
 * pattern most apps use for internal ops/cron endpoints.
 * <p>
 * Mounted outside {@code /api/**} on purpose, so it doesn't read as
 * part of the public API surface, and {@code SecurityConfig} permits
 * this path without requiring a Firebase bearer token — the secret
 * header IS the auth here, checked below, not by Spring Security's
 * filter chain.
 * <p>
 * If {@code mochi.ops.reconciliation-key} is unset (empty string, the
 * default — see {@code application.properties}), this endpoint refuses
 * every request with 503, never falling back to "no secret configured
 * means open to anyone." A misconfigured deployment should fail closed.
 */
@RestController
@RequestMapping("/internal/ops")
public class InternalOpsController {

    private final CounterReconciliationService reconciliationService;
    private final String configuredKey;

    public InternalOpsController(
            CounterReconciliationService reconciliationService,
            @Value("${mochi.ops.reconciliation-key}") String configuredKey) {
        this.reconciliationService = reconciliationService;
        this.configuredKey = configuredKey;
    }

    @PostMapping("/reconciliation/run")
    public ResponseEntity<ApiResponse<Void>> runReconciliation(@RequestHeader(value = "X-Ops-Key", required = false) String providedKey) {
        if (configuredKey == null || configuredKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Reconciliation trigger is not configured (mochi.ops.reconciliation-key is unset)");
        }
        if (providedKey == null || !constantTimeEquals(configuredKey, providedKey)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or missing X-Ops-Key");
        }

        reconciliationService.runNow();
        return ResponseEntity.ok(ApiResponse.success("Reconciliation run complete — see application logs for what, if anything, was corrected", null));
    }

    /**
     * Plain {@code String.equals} short-circuits on the first differing
     * character, which leaks (via response timing) how many leading
     * characters of a guess were correct — a real, if narrow, attack
     * surface for a secret compared this way. Comparing every
     * character regardless of an early mismatch closes that.
     */
    private boolean constantTimeEquals(String expected, String actual) {
        if (expected.length() != actual.length()) {
            return false;
        }
        int diff = 0;
        for (int i = 0; i < expected.length(); i++) {
            diff |= expected.charAt(i) ^ actual.charAt(i);
        }
        return diff == 0;
    }
}
