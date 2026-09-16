package com.mochi.mochibackend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * One aggregated focus-tracking window reported by the client
 * (roughly every 15 seconds). Only duration statistics are stored —
 * never video, frames, landmarks, coordinates, or biometric data.
 * <p>
 * The unique constraint on (study_session_id, client_batch_id) is what
 * makes duplicate submissions (network retries, double flushes)
 * structurally impossible to double-count.
 */
@Entity
@Table(
        name = "focus_batches",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_focus_batches_client_id", columnNames = {"study_session_id", "client_batch_id"})
        },
        indexes = {
                @Index(name = "idx_focus_batches_session", columnList = "study_session_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class FocusBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "study_session_id", nullable = false)
    private StudySession studySession;

    @Column(name = "client_batch_id", nullable = false, length = 64)
    private String clientBatchId;

    @Column(name = "window_started_at", nullable = false)
    private Instant windowStartedAt;

    @Column(name = "window_ended_at", nullable = false)
    private Instant windowEndedAt;

    @Column(name = "focused_millis", nullable = false)
    private long focusedMilliseconds;

    @Column(name = "distracted_millis", nullable = false)
    private long distractedMilliseconds;

    @Column(name = "no_face_millis", nullable = false)
    private long noFaceMilliseconds;

    @Column(name = "multiple_face_millis", nullable = false)
    private long multipleFaceMilliseconds;

    @Column(name = "camera_unavailable_millis", nullable = false)
    private long cameraUnavailableMilliseconds;

    /** Hand detected near/overlapping the face region, sustained — phone pickup heuristic. */
    @Column(name = "phone_millis", nullable = false)
    private long phoneMilliseconds;

    /** Sustained eyes-closed blendshape score above threshold — drowsy/asleep-at-desk heuristic. */
    @Column(name = "drowsy_millis", nullable = false)
    private long drowsyMilliseconds;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
