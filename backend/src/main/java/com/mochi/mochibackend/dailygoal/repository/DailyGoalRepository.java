package com.mochi.mochibackend.dailygoal.repository;

import com.mochi.mochibackend.dailygoal.entity.DailyGoal;
import com.mochi.mochibackend.dailygoal.enums.GoalType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailyGoalRepository extends JpaRepository<DailyGoal, Long> {

    /** Ownership-safe lookup: another user's goal id behaves as "not found". */
    Optional<DailyGoal> findByIdAndUserUid(Long id, String userUid);

    List<DailyGoal> findAllByUserUidAndGoalDateOrderByCreatedAtAsc(String userUid, LocalDate goalDate);

    /**
     * The "active goals of this type, today" lookup automatic progress
     * updates need: every {@code STUDY_MINUTES}/{@code TASKS_COMPLETED}
     * goal a user has open for the day an event happened on, regardless
     * of current completion state (a goal already at target is simply a
     * no-op when {@code DailyGoalService} clamps its increment).
     */
    List<DailyGoal> findAllByUserUidAndGoalDateAndType(String userUid, LocalDate goalDate, GoalType type);
}

