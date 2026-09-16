package com.mochi.mochibackend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Enables {@code @Scheduled} methods app-wide. A separate small config
 * class rather than annotating the main application class — same
 * pattern {@code TimeConfig}/{@code FirestoreConfig} already establish
 * for one-purpose config. First (and currently only) consumer:
 * {@code CounterReconciliationService} (v2 backlog).
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
