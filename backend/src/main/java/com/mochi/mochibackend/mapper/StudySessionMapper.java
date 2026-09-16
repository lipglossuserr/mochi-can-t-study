package com.mochi.mochibackend.mapper;

import com.mochi.mochibackend.dto.StudySessionResponse;
import com.mochi.mochibackend.dto.StudySessionSummaryResponse;
import com.mochi.mochibackend.model.SessionStatus;
import com.mochi.mochibackend.model.StudySession;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

/**
 * Entity -> DTO mapping. Entities are never exposed from controllers.
 * remainingSeconds is computed here from server timestamps so a freshly
 * refreshed client can resume its countdown without trusting any local
 * state.
 */
@Component
public class StudySessionMapper {

    private final Clock clock;

    public StudySessionMapper(Clock clock) {
        this.clock = clock;
    }

    public StudySessionResponse toResponse(StudySession session) {
        Instant now = clock.instant();

        return new StudySessionResponse(
                session.getId(),
                session.getStatus().name(),
                session.getTaskId(),
                session.getPlannedDurationSeconds(),
                session.getAccumulatedStudySeconds(),
                computeRemainingSeconds(session, now),
                session.getStartedAt(),
                session.getLastResumedAt(),
                session.getPausedAt(),
                session.getEndedAt(),
                now,
                session.getTotalPausedSeconds(),
                session.getFocusedSeconds(),
                session.getDistractedSeconds(),
                session.getNoFaceSeconds(),
                session.getMultipleFaceSeconds(),
                session.getCameraUnavailableSeconds(),
                session.getFocusScore(),
                session.getCompletionRatio(),
                session.getSessionClassification() == null ? null : session.getSessionClassification().name()
        );
    }

    public StudySessionSummaryResponse toSummary(StudySession session) {
        return new StudySessionSummaryResponse(
                session.getId(),
                session.getStatus().name(),
                session.getPlannedDurationSeconds(),
                session.getAccumulatedStudySeconds(),
                session.getFocusScore(),
                session.getCompletionRatio(),
                session.getSessionClassification() == null ? null : session.getSessionClassification().name(),
                session.getStartedAt(),
                session.getEndedAt()
        );
    }

    private long computeRemainingSeconds(StudySession session, Instant now) {
        long studied = session.getAccumulatedStudySeconds();

        if (session.getStatus() == SessionStatus.RUNNING && session.getLastResumedAt() != null) {
            studied += Math.max(0, Duration.between(session.getLastResumedAt(), now).getSeconds());
        }

        return Math.max(0, session.getPlannedDurationSeconds() - studied);
    }
}
