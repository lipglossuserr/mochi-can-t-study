package com.mochi.mochibackend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/**
 * Exposes the system UTC clock as a bean so services never call
 * Instant.now() directly — unit tests inject a fixed Clock instead.
 */
@Configuration
public class TimeConfig {

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
