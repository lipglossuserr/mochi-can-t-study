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
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                .authorizeHttpRequests(authorize -> authorize

                        // Protected APIs
                        .requestMatchers("/api/study-sessions/**").authenticated()
                        .requestMatchers("/api/pet/**").authenticated()
                        .requestMatchers("/api/tasks/**").authenticated()
                        .requestMatchers("/api/daily-goals/**").authenticated()

                        .requestMatchers("/api/shop/**").authenticated()
                        .requestMatchers("/api/inventory/**").authenticated()
                        .requestMatchers("/api/room-layout/**").authenticated()

                        .requestMatchers("/api/achievements/**").authenticated()
                        .requestMatchers("/api/leaderboard/**").authenticated()

                        .requestMatchers("/api/flashcard-decks/**").authenticated()
                        .requestMatchers("/api/video/**").authenticated()
                        .requestMatchers("/api/study-buddy/**").authenticated()

                        // Community features
                        .requestMatchers("/api/communities/**").authenticated()

                        // Internal operations
                        .requestMatchers("/internal/ops/**").permitAll()

                        // Everything else
                        .anyRequest().permitAll()
                )

                .exceptionHandling(handling ->
                        handling.authenticationEntryPoint(customAuthenticationEntryPoint)
                )

                .addFilterBefore(
                        firebaseAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }


    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOriginPatterns(allowedOriginPatterns);

        configuration.setAllowedMethods(
                List.of(
                        "GET",
                        "POST",
                        "PUT",
                        "PATCH",
                        "DELETE",
                        "OPTIONS"
                )
        );

        configuration.setAllowedHeaders(
                List.of(
                        "Authorization",
                        "Content-Type"
                )
        );

        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}