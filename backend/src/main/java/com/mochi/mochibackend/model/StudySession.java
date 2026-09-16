package com.mochi.mochibackend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * A single Pomodoro study session owned by one Firebase user.
 * <p>
 * The server is authoritative for all timing: study time is derived from
 * {@code startedAt} / {@code lastResumedAt} / {@code pausedAt} server
 * timestamps, never from client-reported elapsed time.
 * <p>
 * {@code activeMarker} is the concurrency guard: TRUE while the session
 * is RUNNING or PAUSED, NULL once finalized. Combined with the unique
 * constraint on (user_uid, active_marker), MySQL itself makes a second
 * simultaneous active session impossible — even across browser tabs or
 * double-clicked Start buttons (NULLs are exempt from uniqueness, so any
 * number of finalized sessions may coexist).
 */
@Entity
@Table(
        name = "study_sessions",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_study_sessions_active", columnNames = {"user_uid", "active_marker"})
        },
        indexes = {
                @Index(name = "idx_study_sessions_user", columnList = "user_uid")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class StudySession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Firebase uid of the owner. Users may only ever touch their own sessions. */
    @Column(name = "user_uid", nullable = false, length = 128)
    private String userUid;

    /**
     * Optional link to a task. As of Sprint 7.2B this column is backed by
     * a real foreign key ({@code fk_study_sessions_task}, {@code ON DELETE
     * SET NULL} — see {@code V4__link_study_sessions_to_tasks.sql}) and is
     * validated at creation time: a supplied {@code taskId} must exist and
     * belong to the authenticated user, enforced the same
     * ownership-lookup way {@code TaskService.getOwned} already checks it
     * elsewhere. Kept as a plain {@code Long} rather than a JPA
     * {@code @ManyToOne} — this entity doesn't need to navigate to the
     * Task, only to have stored its id, matching how {@code userUid} is
     * also a plain column rather than a relation.
     */
    @Column(name = "task_id")
    private Long taskId;

    /**
     * Optional Firestore co-study room id (rooms/{roomId}) this session
     * was started from. Sprint: Study Rooms Phase 2. Plain String, not a
     * relation — the room lives in Firestore, not this database, same
     * cross-store shape as {@code UserProfile}. Null for every solo
     * session, which remains the overwhelming majority.
     */
    @Column(name = "room_id", length = 64)
    private String roomId;

    @Column(name = "planned_duration_seconds", nullable = false)
    private int plannedDurationSeconds;

    /** Study seconds committed as of the last pause/finalization. */
    @Column(name = "accumulated_study_seconds", nullable = false)
    private long accumulatedStudySeconds;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private SessionStatus status;

    /** TRUE while RUNNING/PAUSED, NULL when finalized. See class javadoc. */
    @Column(name = "active_marker")
    private Boolean activeMarker;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "last_resumed_at")
    private Instant lastResumedAt;

    @Column(name = "paused_at")
    private Instant pausedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    @Column(name = "total_paused_seconds", nullable = false)
    private long totalPausedSeconds;

    @Column(name = "focused_seconds", nullable = false)
    private long focusedSeconds;

    @Column(name = "distracted_seconds", nullable = false)
    private long distractedSeconds;

    @Column(name = "no_face_seconds", nullable = false)
    private long noFaceSeconds;

    @Column(name = "multiple_face_seconds", nullable = false)
    private long multipleFaceSeconds;

    @Column(name = "camera_unavailable_seconds", nullable = false)
    private long cameraUnavailableSeconds;

    /** Aggregated from FocusBatch.phoneMilliseconds — hand-near-face sustained (phone pickup heuristic). */
    @Column(name = "phone_seconds", nullable = false)
    private long phoneSeconds;

    /** Aggregated from FocusBatch.drowsyMilliseconds — eyes-closed sustained (drowsy/asleep heuristic). */
    @Column(name = "drowsy_seconds", nullable = false)
    private long drowsySeconds;

    /** 0-100, computed at finalization; null until then or if unusable. */
    @Column(name = "focus_score")
    private Integer focusScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "session_classification", length = 20)
    private SessionClassification sessionClassification;

    @Column(name = "completion_ratio")
    private Double completionRatio;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Optimistic locking guard against concurrent updates. */
    @Version
    @Column(name = "version", nullable = false)
    private Long version;
}
