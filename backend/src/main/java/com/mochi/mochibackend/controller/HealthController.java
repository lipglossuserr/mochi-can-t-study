package com.mochi.mochibackend.controller;

import com.mochi.mochibackend.dto.ApiResponse;
import com.mochi.mochibackend.dto.HealthResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Minimal health check endpoint.
 * <p>
 * Exists only to confirm that the REST layer, security configuration, and
 * standard response envelope are wired up correctly. No business logic.
 */
@RestController
public class HealthController {

    @GetMapping("/api/health")
    public ApiResponse<HealthResponse> health() {
        return ApiResponse.success("OK", new HealthResponse("UP", "Mochi Backend"));
    }

}
