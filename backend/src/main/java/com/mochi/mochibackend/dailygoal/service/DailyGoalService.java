package com.mochi.mochibackend.dailygoal.service;

import com.mochi.mochibackend.dailygoal.dto.CreateDailyGoalRequest;
import com.mochi.mochibackend.dailygoal.dto.UpdateDailyGoalRequest;
import com.mochi.mochibackend.dailygoal.dto.UpdateProgressRequest;
import com.mochi.mochibackend.dailygoal.entity.DailyGoal;
import com.mochi.mochibackend.dailygoal.enums.GoalType;
import com.mochi.mochibackend.dailygoal.repository.DailyGoalRepository;
import com.mochi.mochibackend.exception.DailyGoalNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * All daily-goal CRUD, progress-tracking, and automatic-progress logic.
 * Ownership is enforced the same way {@code TaskService} enforces it:
 * every read or mutation on a specific goal goes through
 * {@link #requireOwnedGoal(String, Long)}, so a goal id belonging to
 * another user is indistinguishable from one that doesn't exist.
 * <p>
 * This is also the single place that turns "a study session completed"
 * or "a task completed" into daily-goal progress — {@code
 * StudySessionService} and {@code TaskService} call {@link
 * #recordStudyMinutes} / {@link #recordTaskCompleted} directly from
 * their own completion methods (the same direct-call pattern {@code
 * StudySessionService} already uses for {@code RewardService}), so
 * there is exactly one code path that ever advances {@code current} on
 * a goal, whether the update was requested manually via {@link
 * #updateProgress} or triggered automatically by another module.
 * <p>
 * Deliberately not implemented here — see the sprint scope: rewards,
 * XP, character events, achievements, and notifications remain entirely
 * {@code RewardService}'s concern; this service never touches a pet.
 */
@Service
public class DailyGoalService {

    private final DailyGoalRepository dailyGoalRepository;
    private final Clock clock;

    public DailyGoalService(DailyGoalRepository dailyGoalRepository, Clock clock) {
        this.dailyGoalRepository = dailyGoalRepository;
        this.clock = clock;
    }

    @Transactional
    public DailyGoal create(String userUid, CreateDailyGoalRequest request) {
        DailyGoal goal = new DailyGoal();
        goal.setUserUid(userUid);
        goal.setGoalDate(request.getGoalDate() != null ? request.getGoalDate() : today());
        goal.setType(request.getType());
        goal.setTitle(request.getTitle());
        goal.setTarget(request.getTarget());
        goal.setCurrent(0);
        goal.setCompleted(false);

        return dailyGoalRepository.save(goal);
    }

    @Transactional
    public DailyGoal update(String userUid, Long goalId, UpdateDailyGoalRequest request) {
        DailyGoal goal = requireOwnedGoal(userUid, goalId);

        goal.setTitle(request.getTitle());
        goal.setTarget(request.getTarget());
        // Changing the target can flip completion in either direction
        // (e.g. raising a target the current progress no longer meets).
        recomputeCompletion(goal);

        return dailyGoalRepository.save(goal);
    }

    /**
     * Sets absolute progress (not a delta), clamped to {@code [0, target]}
     * so a caller can never push a goal's progress negative or past its
     * target. Recomputes {@code completed}/{@code completedAt} to match.
     * This is the manual-entry path; {@link #recordStudyMinutes} and
     * {@link #recordTaskCompleted} are the automatic path, and both
     * funnel through the same clamp-and-recompute logic below.
     */
    @Transactional
    public DailyGoal updateProgress(String userUid, Long goalId, UpdateProgressRequest request) {
        DailyGoal goal = requireOwnedGoal(userUid, goalId);

        applyProgress(goal, request.getCurrent());

        return dailyGoalRepository.save(goal);
    }

    @Transactional
    public void delete(String userUid, Long goalId) {
        DailyGoal goal = requireOwnedGoal(userUid, goalId);
        dailyGoalRepository.delete(goal);
    }

    @Transactional(readOnly = true)
    public DailyGoal getOwned(String userUid, Long goalId) {
        return requireOwnedGoal(userUid, goalId);
    }

    /** Defaults to "today" (server clock) when no date is supplied. */
    @Transactional(readOnly = true)
    public List<DailyGoal> findAllForUser(String userUid, Optional<LocalDate> goalDate) {
        LocalDate date = goalDate.orElseGet(this::today);
        return dailyGoalRepository.findAllByUserUidAndGoalDateOrderByCreatedAtAsc(userUid, date);
    }

    // ---------- automatic progress (called from StudySessionService / TaskService) ----------

    /**
     * Called by {@code StudySessionService.complete} on the one
     * transition into a VALID completion — never on an idempotent
     * duplicate-complete request, since that method returns before
     * reaching this call, and never for a PARTIAL/INVALID session,
     * since the caller only invokes this for VALID ones. Adds {@code
     * minutes} to every {@code STUDY_MINUTES} goal the user has for
     * today; a no-op if {@code minutes <= 0} or there are no such
     * goals.
     */
    @Transactional
    public void recordStudyMinutes(String userUid, int minutes) {
        incrementActiveGoalsByType(userUid, GoalType.STUDY_MINUTES, minutes);
    }

    /**
     * Called by {@code TaskService.complete} on the one transition into
     * COMPLETED — never on an idempotent duplicate-complete request,
     * since that method returns before reaching this call. Adds 1 to
     * every {@code TASKS_COMPLETED} goal the user has for today.
     */
    @Transactional
    public void recordTaskCompleted(String userUid) {
        incrementActiveGoalsByType(userUid, GoalType.TASKS_COMPLETED, 1);
    }

    // ------------------------------------------------------------------

    /**
     * Shared engine behind both automatic-progress entry points: finds
     * every one of the user's goals for today matching {@code type}
     * ("active" — there is no separate archival/inactive state a goal
     * can be in) and adds {@code amount} to each one's current
     * progress, clamped to that goal's own target. A goal already at
     * its target is simply clamped back to itself — incrementing it
     * further is a safe no-op, not an error.
     */
    private void incrementActiveGoalsByType(String userUid, GoalType type, int amount) {
        if (amount <= 0) {
            return;
        }

        List<DailyGoal> goals = dailyGoalRepository.findAllByUserUidAndGoalDateAndType(userUid, today(), type);
        for (DailyGoal goal : goals) {
            applyProgress(goal, goal.getCurrent() + amount);
            dailyGoalRepository.save(goal);
        }
    }

    /** Clamps {@code newCurrent} to {@code [0, target]} and recomputes completion to match. */
    private void applyProgress(DailyGoal goal, int newCurrent) {
        int clamped = Math.max(0, Math.min(newCurrent, goal.getTarget()));
        goal.setCurrent(clamped);
        recomputeCompletion(goal);
    }

    private LocalDate today() {
        return LocalDate.now(clock);
    }

    /**
     * Flips {@code completed} to match {@code current >= target} and
     * keeps {@code completedAt} consistent with that transition:
     * stamped the moment it first becomes true, cleared the moment it
     * reverts to false. Reapplying with no change in state is a no-op —
     * completing an already-completed goal does not re-stamp
     * {@code completedAt}, the same idempotence rule
     * {@code TaskService.complete} follows.
     */
    private void recomputeCompletion(DailyGoal goal) {
        boolean shouldBeCompleted = goal.getCurrent() >= goal.getTarget();

        if (shouldBeCompleted && !goal.isCompleted()) {
            goal.setCompleted(true);
            goal.setCompletedAt(clock.instant());
        } else if (!shouldBeCompleted && goal.isCompleted()) {
            goal.setCompleted(false);
            goal.setCompletedAt(null);
        }
    }

    private DailyGoal requireOwnedGoal(String userUid, Long goalId) {
        return dailyGoalRepository.findByIdAndUserUid(goalId, userUid)
                .orElseThrow(() -> new DailyGoalNotFoundException("Daily goal not found"));
    }
}

