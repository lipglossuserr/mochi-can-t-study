package com.mochi.mochibackend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mochi.mochibackend.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Produces the project's standard {@link ApiResponse} JSON shape whenever
 * Spring Security rejects an unauthenticated request to a protected
 * endpoint, instead of Spring's default HTML/basic-auth challenge.
 * <p>
 * Not yet wired into any protected endpoint — no endpoint currently
 * requires authentication, so this entry point is not triggered today. It
 * exists now so the response shape is ready when endpoints are protected
 * in a future sprint.
 */
@Component
public class CustomAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public CustomAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request,
                          HttpServletResponse response,
                          AuthenticationException authException) throws IOException {

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        ApiResponse<Void> body = ApiResponse.error("Authentication required");
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }

}
