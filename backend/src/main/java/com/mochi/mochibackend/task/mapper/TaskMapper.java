package com.mochi.mochibackend.task.mapper;

import com.mochi.mochibackend.task.dto.TaskResponse;
import com.mochi.mochibackend.task.entity.Task;
import org.springframework.stereotype.Component;

/**
 * Entity -> DTO mapping. Entities are never exposed from controllers.
 */
@Component
public class TaskMapper {

    public TaskResponse toResponse(Task task) {
        return new TaskResponse(
                task.getId(),
                task.getTitle(),
                task.getDescription(),
                task.getDueDate(),
                task.getPriority().name(),
                task.getStatus().name(),
                task.getCompletedAt(),
                task.getCreatedAt(),
                task.getUpdatedAt()
        );
    }
}
