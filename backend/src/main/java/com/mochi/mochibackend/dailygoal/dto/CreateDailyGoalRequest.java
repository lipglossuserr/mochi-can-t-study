package com.mochi.mochibackend.dailygoal.dto;

import com.mochi.mochibackend.dailygoal.enums.GoalType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Request payload for {@code POST /api/daily-goals}.
 * <p>
 * {@code goalDate} is optional; the service defaults it to "today"
 * (server clock) rather than requiring every caller to compute it
 * client-side. {@code current} and {@code completed} are deliberately
 * not part of this DTO — every goal is created at zero progress; use
 * the dedicated progress-update endpoint, the same way {@code Task}
 * keeps its completion transition off its create request.
 */
@Getter
@Setter
public class CreateDailyGoalRequest {

    private LocalDate goalDate;

    @NotNull(message = "Goal type is required")
    private GoalType type;

    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must be at most 200 characters")
    private String title;

    @NotNull(message = "Target is required")
    @Positive(message = "Target must be greater than zero")
    private Integer target;
}
