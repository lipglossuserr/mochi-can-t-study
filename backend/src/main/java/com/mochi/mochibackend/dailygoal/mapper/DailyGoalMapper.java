package com.mochi.mochibackend.dailygoal.mapper;

import com.mochi.mochibackend.dailygoal.dto.DailyGoalResponse;
import com.mochi.mochibackend.dailygoal.entity.DailyGoal;
import org.springframework.stereotype.Component;

/**
 * Entity -> DTO mapping. Entities are never exposed from controllers.
 */
@Component
public class DailyGoalMapper {

    public DailyGoalResponse toResponse(DailyGoal goal) {
        return new DailyGoalResponse(
                goal.getId(),
                goal.getGoalDate(),
                goal.getType().name(),
                goal.getTitle(),
                goal.getCurrent(),
                goal.getTarget(),
                goal.isCompleted(),
                goal.getCompletedAt(),
                goal.getCreatedAt(),
                goal.getUpdatedAt()
        );
    }
}
