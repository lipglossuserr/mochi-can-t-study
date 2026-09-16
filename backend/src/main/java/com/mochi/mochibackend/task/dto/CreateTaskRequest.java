package com.mochi.mochibackend.task.dto;

import com.mochi.mochibackend.task.enums.TaskPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Request payload for {@code POST /api/tasks}.
 * <p>
 * {@code priority} is optional; the service defaults it to
 * {@link TaskPriority#MEDIUM} rather than requiring every caller to
 * supply it. {@code status} is deliberately not part of this DTO —
 * every task is created PENDING; completion goes through the dedicated
 * {@code /complete} action, the same way {@code StudySession} keeps
 * lifecycle transitions off its create request.
 */
@Getter
@Setter
public class CreateTaskRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must be at most 200 characters")
    private String title;

    @Size(max = 2000, message = "Description must be at most 2000 characters")
    private String description;

    private LocalDate dueDate;

    private TaskPriority priority;
}