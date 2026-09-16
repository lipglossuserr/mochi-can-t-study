package com.mochi.mochibackend.dailygoal.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Request payload for {@code PUT /api/daily-goals/{id}}. Edits the
 * descriptive fields of a goal — title and target. {@code goalDate} and
 * {@code type} are intentionally not editable here (create a new goal
 * instead); {@code current}/{@code completed} are intentionally not
 * editable here either — use {@code /progress}.
 */
@Getter
@Setter
public class UpdateDailyGoalRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must be at most 200 characters")
    private String title;

    @NotNull(message = "Target is required")
    @Positive(message = "Target must be greater than zero")
    private Integer target;
}
