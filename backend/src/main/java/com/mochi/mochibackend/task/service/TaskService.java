package com.mochi.mochibackend.task.service;

import com.mochi.mochibackend.dailygoal.service.DailyGoalService;
import com.mochi.mochibackend.exception.TaskNotFoundException;
import com.mochi.mochibackend.pet.config.RewardPolicy;
import com.mochi.mochibackend.pet.service.RewardService;
import com.mochi.mochibackend.task.dto.CreateTaskRequest;
import com.mochi.mochibackend.task.dto.UpdateTaskRequest;
import com.mochi.mochibackend.task.entity.Task;
import com.mochi.mochibackend.task.enums.TaskPriority;
import com.mochi.mochibackend.task.enums.TaskStatus;
import com.mochi.mochibackend.task.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.List;
import java.util.Optional;

/**
 * All task CRUD and completion-lifecycle logic. Ownership is enforced the
 * same way {@code StudySessionService} enforces it: every read or mutation
 * goes through {@link #requireOwnedTask(String, Long)}, so a task id
 * belonging to another user is indistinguishable from one that doesn't
 * exist.
 * <p>
 * On genuine completion (never on the idempotent early-return for an
 * already-completed task), this service makes two calls out to other
 * domains: {@link DailyGoalService#recordTaskCompleted} for daily-goal
 * progress, and {@link RewardService#applyTaskCompletionReward} for
 * XP/coins/mood, scaled by the task's priority — the same direct-call
 * pattern {@code StudySessionService} uses for both of those same two
 * services. Achievement unlocking and character-event emission remain
 * out of scope for this service.
 */
@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final Clock clock;
    private final DailyGoalService dailyGoalService;
    private final RewardService rewardService;

    public TaskService(
            TaskRepository taskRepository,
            Clock clock,
            DailyGoalService dailyGoalService,
            RewardService rewardService) {
        this.taskRepository = taskRepository;
        this.clock = clock;
        this.dailyGoalService = dailyGoalService;
        this.rewardService = rewardService;
    }

    @Transactional
    public Task create(String userUid, CreateTaskRequest request) {
        Task task = new Task();
        task.setUserUid(userUid);
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setDueDate(request.getDueDate());
        task.setPriority(request.getPriority() != null ? request.getPriority() : TaskPriority.MEDIUM);
        task.setStatus(TaskStatus.PENDING);

        return taskRepository.save(task);
    }

    @Transactional
    public Task update(String userUid, Long taskId, UpdateTaskRequest request) {
        Task task = requireOwnedTask(userUid, taskId);

        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setDueDate(request.getDueDate());
        task.setPriority(request.getPriority() != null ? request.getPriority() : task.getPriority());

        return taskRepository.save(task);
    }

    /**
     * Idempotent: completing an already-COMPLETED task returns it
     * unchanged rather than bumping {@code completedAt} again — the same
     * idempotence rule {@code StudySessionService.complete} follows, and
     * important for the same reason a reward has to rely on it:
     * {@link DailyGoalService#recordTaskCompleted} and
     * {@link RewardService#applyTaskCompletionReward} below are only
     * ever reached on the one real transition into COMPLETED, never on
     * this early return, so a repeated completion request can never
     * double-count a {@code TASKS_COMPLETED} goal or double-grant XP/coins.
     */
    @Transactional
    public Task complete(String userUid, Long taskId) {
        Task task = requireOwnedTask(userUid, taskId);

        if (task.getStatus() == TaskStatus.COMPLETED) {
            return task;
        }

        task.setStatus(TaskStatus.COMPLETED);
        task.setCompletedAt(clock.instant());

        Task saved = taskRepository.save(task);

        // Daily-goal progress and the pet reward only ever fire from
        // this one real completion path.
        dailyGoalService.recordTaskCompleted(userUid);
        rewardService.applyTaskCompletionReward(
                userUid, xpForPriority(task.getPriority()), coinsForPriority(task.getPriority()));

        return saved;
    }

    /** Idempotent: reopening an already-PENDING task returns it unchanged. */
    @Transactional
    public Task reopen(String userUid, Long taskId) {
        Task task = requireOwnedTask(userUid, taskId);

        if (task.getStatus() == TaskStatus.PENDING) {
            return task;
        }

        task.setStatus(TaskStatus.PENDING);
        task.setCompletedAt(null);

        return taskRepository.save(task);
    }

    @Transactional
    public void delete(String userUid, Long taskId) {
        Task task = requireOwnedTask(userUid, taskId);
        taskRepository.delete(task);
    }

    @Transactional(readOnly = true)
    public Task getOwned(String userUid, Long taskId) {
        return requireOwnedTask(userUid, taskId);
    }

    @Transactional(readOnly = true)
    public List<Task> findAllForUser(String userUid, Optional<TaskStatus> status) {
        return status
                .map(s -> taskRepository.findAllByUserUidAndStatusOrderByCreatedAtDesc(userUid, s))
                .orElseGet(() -> taskRepository.findAllByUserUidOrderByCreatedAtDesc(userUid));
    }

    // ------------------------------------------------------------------

    private Task requireOwnedTask(String userUid, Long taskId) {
        return taskRepository.findByIdAndUserUid(taskId, userUid)
                .orElseThrow(() -> new TaskNotFoundException("Task not found"));
    }

    private int xpForPriority(TaskPriority priority) {
        return switch (priority) {
            case LOW -> RewardPolicy.TASK_XP_LOW;
            case MEDIUM -> RewardPolicy.TASK_XP_MEDIUM;
            case HIGH -> RewardPolicy.TASK_XP_HIGH;
        };
    }

    private int coinsForPriority(TaskPriority priority) {
        return switch (priority) {
            case LOW -> RewardPolicy.TASK_COINS_LOW;
            case MEDIUM -> RewardPolicy.TASK_COINS_MEDIUM;
            case HIGH -> RewardPolicy.TASK_COINS_HIGH;
        };
    }
}