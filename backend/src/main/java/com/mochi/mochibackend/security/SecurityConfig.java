package com.mochi.mochibackend.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Spring Security configuration.
 * <p>
 * The Firebase authentication foundation is wired in
 * ({@link FirebaseAuthenticationFilter} runs on every request and
 * populates the security context when a valid bearer token is present).
 * Most endpoints still {@code permitAll()}, but {@code /api/study-sessions/**}
 * (added in Sprint 2), {@code /api/pet/**} (added in Sprint 4A),
 * {@code /api/tasks/**} (added in Sprint 7.2A), and
 * {@code /api/daily-goals/**} (added in Sprint 7.4A) require authentication.
 * {@code /api/shop/**}, {@code /api/inventory/**}, and
 * {@code /api/room-layout/**} (added for furniture/toy/decoration
 * ownership and placement) require authentication too, as does
 * {@code /api/leaderboard/**}, {@code /api/video/**} (Study Rooms
 * Phase 3 — LiveKit token issuance), {@code /api/communities/**}
 * (Community Rooms, Phase 1), and {@code /api/flashcard-decks/**}
 * join the list too — every one of them resolves the caller's uid
 * from the Firebase token.
 * <p>
 * {@code /internal/ops/**} is explicitly {@code permitAll()} — it's
 * outside {@code /api/**} on purpose (see {@code InternalOpsController}'s
 * javadoc) and authenticated by a shared-secret header the controller
 * itself checks, not by this filter chain. Listed explicitly here
 * rather than relying on the {@code anyRequest().permitAll()} fallback
 * below, so the "this path skips Firebase auth deliberately" decision
 * is visible in one place instead of implicit.
 * <p>
 * CORS is registered explicitly via {@code .cors(...)} so that Spring
 * Security installs its {@code CorsFilter} early in the chain, ahead of
 * authorization. Without this, cross-origin preflight (OPTIONS) requests
 * from the frontend are rejected before ever reaching a controller.
 * <p>
 * Origins are configured via {@code mochi.cors.allowed-origins} (comma-separated)
 * and matched as PATTERNS, not exact strings - this lets the Vite dev server
 * survive its auto-incrementing port (5173 -> 5174 -> ...) without the value
 * needing to be updated every time a port is already taken, while still
 * keeping the allow-list itself externalized to configuration for prod use.
 */
@Configuration
public class SecurityConfig {

    private final FirebaseAuthenticationFilter firebaseAuthenticationFilter;
    private final CustomAuthenticationEntryPoint customAuthenticationEntryPoint;
    private final List<String> allowedOriginPatterns;

    public SecurityConfig(
            FirebaseAuthenticationFilter firebaseAuthenticationFilter,
            CustomAuthenticationEntryPoint customAuthenticationEntryPoint,
            @Value("${mochi.cors.allowed-origins}") String allowedOrigins
    ) {
        this.firebaseAuthenticationFilter = firebaseAuthenticationFilter;
        this.customAuthenticationEntryPoint = customAuthenticationEntryPoint;
        this.allowedOriginPatterns = Arrays.asList(allowedOrigins.split(","));
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .formLogin(formLogin -> formLogin.disable())
                .httpBasic(httpBasic -> httpBasic.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/api/study-sessions/**").authenticated()
                        .requestMatchers("/api/pet/**").authenticated()
                        .requestMatchers("/api/tasks/**").authenticated()
                        .requestMatchers("/api/daily-goals/**").authenticated()
                        .requestMatchers("/api/shop/**").authenticated()
                        .requestMatchers("/api/inventory/**").authenticated()
                        .requestMatchers("/api/room-layout/**").authenticated()
                        .requestMatchers("/api/achievements/**").authenticated()
                        .requestMatchers("/api/leaderboard/**").authenticated()
                        .requestMatchers("/api/video/**").authenticated()
                        .requestMatchers("/api/study-buddy/**").authenticated()
                        .requestMatchers("/api/communities/**").authenticated()
                        .requestMatchers("/api/flashcard-decks/**").authenticated()
                        .requestMatchers("/internal/ops/**").permitAll()
                        .anyRequest().permitAll()
                )
                .exceptionHandling(handling -> handling.authenticationEntryPoint(customAuthenticationEntryPoint))
                .addFilterBefore(firebaseAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Defines which cross-origin requests the browser is allowed to make.
     * Origin PATTERNS come from {@code mochi.cors.allowed-origins} (comma-separated),
     * e.g. {@code http://localhost:*}, so staging/production frontend origins can be
     * added later without touching this class - only configuration.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(allowedOriginPatterns);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

}
