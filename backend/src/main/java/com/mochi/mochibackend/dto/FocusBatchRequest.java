package com.mochi.mochibackend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/**
 * One aggregated focus-tracking window, roughly 15 seconds of locally
 * measured durations. Contains statistics only — never images, video,
 * landmarks, or coordinates.
 */
@Getter
@Setter
public class FocusBatchRequest {

    @NotBlank(message = "clientBatchId is required")
    @Size(max = 64, message = "clientBatchId must be at most 64 characters")
    private String clientBatchId;

    @NotNull(message = "windowStartedAt is required")
    private Instant windowStartedAt;

    @NotNull(message = "windowEndedAt is required")
    private Instant windowEndedAt;

    @PositiveOrZero(message = "focusedMilliseconds cannot be negative")
    private long focusedMilliseconds;

    @PositiveOrZero(message = "distractedMilliseconds cannot be negative")
    private long distractedMilliseconds;

    @PositiveOrZero(message = "noFaceMilliseconds cannot be negative")
    private long noFaceMilliseconds;

    @PositiveOrZero(message = "multipleFaceMilliseconds cannot be negative")
    private long multipleFaceMilliseconds;

    @PositiveOrZero(message = "cameraUnavailableMilliseconds cannot be negative")
    private long cameraUnavailableMilliseconds;

    @PositiveOrZero(message = "phoneMilliseconds cannot be negative")
    private long phoneMilliseconds;

    @PositiveOrZero(message = "drowsyMilliseconds cannot be negative")
    private long drowsyMilliseconds;
}
