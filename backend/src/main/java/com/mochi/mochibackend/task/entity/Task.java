package com.mochi.mochibackend.task.entity;

import com.mochi.mochibackend.task.enums.TaskPriority;
import com.mochi.mochibackend.task.enums.TaskStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;

/**
 * A user-owned task. A user may have any number of tasks, unlike the
 * one-per-user {@code Pet} — ownership is enforced the same way
 * {@code StudySession} does it, though: every read/write goes through a
 * {@code findByIdAndUserUid}-style lookup so another user's task id
 * behaves as "not found" rather than "forbidden" (see
 * {@code TaskNotFoundException}).
 * <p>
 * {@code taskId} already exists as a nullable, FK-less column on
 * {@code study_sessions} (added in Sprint 2 as an extension point). This
 * sprint deliberately does not add the other side of that link, and does
 * not touch {@code StudySession} at all — wiring a session to a real task
 * (and anything that flows from that, like auto-completion) is Sprint
 * 7.2B's job, once this table exists for it to reference.
 */
@Entity
@Table(
        name = "tasks",
        indexes = {
                @Index(name = "idx_tasks_user", columnList = "user_uid"),
                @Index(name = "idx_tasks_user_status", columnList = "user_uid, status")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Firebase uid of the owner. Users may only ever touch their own tasks. */
    @Column(name = "user_uid", nullable = false, length = 128)
    private String userUid;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", length = 2000)
    private String description;

    /** Optional; when the task is meant to be done by. A calendar day,
     * not a moment in time — LocalDate on purpose, not Instant (a due
     * date has no meaningful hour/timezone). Not a reminder/notification
     * trigger — display-only for now. */
    @Column(name = "due_date")
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 10)
    private TaskPriority priority;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private TaskStatus status;

    /** Set when {@code status} transitions to COMPLETED, cleared on reopen. */
    @Column(name = "completed_at")
    private Instant completedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Optimistic locking guard against concurrent updates (e.g. double-tapped complete). */
    @Version
    @Column(name = "version", nullable = false)
    private Long version;
}