package com.mochi.mochibackend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Full session state. Carries everything the frontend needs to restore
 * the timer after a page refresh: server timestamps, committed study
 * seconds, current server time (for clock-skew correction), and a
 * server-computed remainingSeconds convenience value.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StudySessionResponse {

    private Long id;
    private String status;
    private Long taskId;
    private String roomId;

    private int plannedDurationSeconds;
    private long accumulatedStudySeconds;
    private long remainingSeconds;

    private Instant startedAt;
    private Instant lastResumedAt;
    private Instant pausedAt;
    private Instant endedAt;
    private Instant serverTime;

    private long totalPausedSeconds;

    private long focusedSeconds;
    private long distractedSeconds;
    private long noFaceSeconds;
    private long multipleFaceSeconds;
    private long cameraUnavailableSeconds;
    private long phoneSeconds;
    private long drowsySeconds;

    private Integer focusScore;
    private Double completionRatio;
    private String sessionClassification;
}
