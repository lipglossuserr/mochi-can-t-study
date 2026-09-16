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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    private static final String UID = "user-abc";
    private static final Instant NOW = Instant.parse("2026-08-13T10:00:00Z");

    @Mock
    private TaskRepository repository;

    @Mock
    private DailyGoalService dailyGoalService;

    @Mock
    private RewardService rewardService;

    private TaskService service;

    @BeforeEach
    void setUp() {
        Clock fixed = Clock.fixed(NOW, ZoneOffset.UTC);
        service = new TaskService(repository, fixed, dailyGoalService, rewardService);

        lenient().when(repository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ---------- create ----------

    @Test
    void createDefaultsPriorityToMediumWhenNotSupplied() {
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("Physics revision");

        Task task = service.create(UID, request);

        assertThat(task.getUserUid()).isEqualTo(UID);
        assertThat(task.getTitle()).isEqualTo("Physics revision");
        assertThat(task.getPriority()).isEqualTo(TaskPriority.MEDIUM);
        assertThat(task.getStatus()).isEqualTo(TaskStatus.PENDING);
    }

    @Test
    void createAcceptsAnExplicitDueDateAsAPlainCalendarDay() {
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("Submit lab report");
        request.setDueDate(LocalDate.of(2026, 8, 20));
        request.setPriority(TaskPriority.HIGH);

        Task task = service.create(UID, request);

        assertThat(task.getDueDate()).isEqualTo(LocalDate.of(2026, 8, 20));
        assertThat(task.getPriority()).isEqualTo(TaskPriority.HIGH);
    }

    // ---------- update ----------

    @Test
    void updateReplacesTheEditableFields() {
        Task existing = pendingTask(TaskPriority.LOW);
        when(repository.findByIdAndUserUid(1L, UID)).thenReturn(Optional.of(existing));

        UpdateTaskRequest request = new UpdateTaskRequest();
        request.setTitle("Updated title");
        request.setDescription("New details");
        request.setDueDate(LocalDate.of(2026, 9, 1));
        request.setPriority(TaskPriority.HIGH);

        Task updated = service.update(UID, 1L, request);

        assertThat(updated.getTitle()).isEqualTo("Updated title");
        assertThat(updated.getDescription()).isEqualTo("New details");
        assertThat(updated.getDueDate()).isEqualTo(LocalDate.of(2026, 9, 1));
        assertThat(updated.getPriority()).isEqualTo(TaskPriority.HIGH);
    }

    // ---------- complete: idempotence + reward wiring ----------

    @Test
    void completingAPendingTaskMarksItCompletedAndGrantsAScaledReward() {
        Task task = pendingTask(TaskPriority.HIGH);
        when(repository.findByIdAndUserUid(1L, UID)).thenReturn(Optional.of(task));

        Task completed = service.complete(UID, 1L);

        assertThat(completed.getStatus()).isEqualTo(TaskStatus.COMPLETED);
        assertThat(completed.getCompletedAt()).isEqualTo(NOW);
        verify(dailyGoalService).recordTaskCompleted(UID);
        verify(rewardService).applyTaskCompletionReward(
                UID, RewardPolicy.TASK_XP_HIGH, RewardPolicy.TASK_COINS_HIGH);
    }

    @Test
    void lowPriorityTaskGrantsTheSmallerReward() {
        Task task = pendingTask(TaskPriority.LOW);
        when(repository.findByIdAndUserUid(1L, UID)).thenReturn(Optional.of(task));

        service.complete(UID, 1L);

        verify(rewardService).applyTaskCompletionReward(
                UID, RewardPolicy.TASK_XP_LOW, RewardPolicy.TASK_COINS_LOW);
    }

    @Test
    void completingAnAlreadyCompletedTaskIsIdempotentAndGrantsNoRepeatReward() {
        Task task = pendingTask(TaskPriority.MEDIUM);
        task.setStatus(TaskStatus.COMPLETED);
        task.setCompletedAt(NOW.minusSeconds(3600));
        when(repository.findByIdAndUserUid(1L, UID)).thenReturn(Optional.of(task));

        Task result = service.complete(UID, 1L);

        assertThat(result.getCompletedAt()).isEqualTo(NOW.minusSeconds(3600)); // unchanged
        verify(repository, never()).save(any(Task.class));
        verify(dailyGoalService, never()).recordTaskCompleted(anyString());
        verify(rewardService, never()).applyTaskCompletionReward(anyString(), anyInt(), anyInt());
    }

    // ---------- reopen ----------

    @Test
    void reopenReturnsACompletedTaskToPending() {
        Task task = pendingTask(TaskPriority.MEDIUM);
        task.setStatus(TaskStatus.COMPLETED);
        task.setCompletedAt(NOW);
        when(repository.findByIdAndUserUid(1L, UID)).thenReturn(Optional.of(task));

        Task reopened = service.reopen(UID, 1L);

        assertThat(reopened.getStatus()).isEqualTo(TaskStatus.PENDING);
        assertThat(reopened.getCompletedAt()).isNull();
    }

    @Test
    void reopeningAnAlreadyPendingTaskIsIdempotent() {
        Task task = pendingTask(TaskPriority.MEDIUM);
        when(repository.findByIdAndUserUid(1L, UID)).thenReturn(Optional.of(task));

        service.reopen(UID, 1L);

        verify(repository, never()).save(any(Task.class));
    }

    // ---------- ownership ----------

    @Test
    void accessingAnotherUsersTaskBehavesAsNotFound() {
        when(repository.findByIdAndUserUid(eq(1L), anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.complete(UID, 1L))
                .isInstanceOf(TaskNotFoundException.class);
    }

    // ---------- delete ----------

    @Test
    void deleteRemovesAnOwnedTask() {
        Task task = pendingTask(TaskPriority.MEDIUM);
        when(repository.findByIdAndUserUid(1L, UID)).thenReturn(Optional.of(task));

        service.delete(UID, 1L);

        verify(repository).delete(task);
    }

    // ---------- helpers ----------

    private Task pendingTask(TaskPriority priority) {
        Task task = new Task();
        task.setId(1L);
        task.setUserUid(UID);
        task.setTitle("Sample task");
        task.setPriority(priority);
        task.setStatus(TaskStatus.PENDING);
        return task;
    }
}