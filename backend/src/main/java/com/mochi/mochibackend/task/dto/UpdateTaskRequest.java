package com.mochi.mochibackend.task.dto;

import com.mochi.mochibackend.task.enums.TaskPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate; // changed from java.time.Instant

/**
 * Request payload for {@code PUT /api/tasks/{id}}. Edits the descriptive
 * fields of a task (a full form re-save, not a partial patch) — title,
 * description, due date, priority. {@code status} is intentionally not
 * editable here; use {@code /complete} or {@code /reopen}.
 */
@Getter
@Setter
public class UpdateTaskRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must be at most 200 characters")
    private String title;

    @Size(max = 2000, message = "Description must be at most 2000 characters")
    private String description;

    private LocalDate dueDate; // changed from Instant dueDate

    private TaskPriority priority;
}