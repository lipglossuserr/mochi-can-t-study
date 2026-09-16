package com.mochi.mochibackend.task.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Public view of a task. Entities are never exposed from controllers —
 * every response goes through {@code TaskMapper}. The client never
 * supplies or sees the internal {@code userUid}; ownership is implicit
 * in "this is the caller's task".
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TaskResponse {

    private Long id;
    private String title;
    private String description;
    private LocalDate dueDate;
    private String priority;
    private String status;
    private Instant completedAt;
    private Instant createdAt;
    private Instant updatedAt;
}