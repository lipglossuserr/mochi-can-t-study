package com.mochi.mochibackend.dailygoal.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.Setter;

/**
 * Request payload for {@code PATCH /api/daily-goals/{id}/progress}.
 * {@code current} is the new absolute progress value (not a delta) —
 * the caller reports where progress stands, and the service clamps it
 * to {@code [0, target]} and recomputes {@code completed} accordingly.
 * <p>
 * Deliberately not an increment/decrement action: the eventual
 * automatic-update pipeline (out of scope this sprint) will recompute
 * an absolute value from study/task data too, so both callers share the
 * same "set current progress" contract instead of one adding and the
 * other setting.
 */
@Getter
@Setter
public class UpdateProgressRequest {

    @NotNull(message = "Current progress is required")
    @PositiveOrZero(message = "Current progress cannot be negative")
    private Integer current;
}
