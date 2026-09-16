package com.mochi.mochibackend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Compact row for the session-history list (GET /api/study-sessions/me). */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StudySessionSummaryResponse {

    private Long id;
    private String status;
    private int plannedDurationSeconds;
    private long accumulatedStudySeconds;
    private Integer focusScore;
    private Double completionRatio;
    private String sessionClassification;
    private Instant startedAt;
    private Instant endedAt;
}
