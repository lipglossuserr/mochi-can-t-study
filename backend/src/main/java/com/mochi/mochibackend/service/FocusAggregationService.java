package com.mochi.mochibackend.service;

import com.mochi.mochibackend.config.FocusPolicy;
import com.mochi.mochibackend.dto.FocusBatchAck;
import com.mochi.mochibackend.dto.FocusBatchRequest;
import com.mochi.mochibackend.exception.InvalidFocusBatchException;
import com.mochi.mochibackend.model.FocusBatch;
import com.mochi.mochibackend.model.StudySession;
import com.mochi.mochibackend.repository.FocusBatchRepository;
import com.mochi.mochibackend.repository.StudySessionRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

/**
 * Validates and aggregates client-reported focus windows into the owning
 * session's counters. Only duration statistics ever reach this service —
 * the API contract forbids frames, landmarks, or any biometric payload.
 * <p>
 * Validation enforced here (server-side, per requirements):
 * negatives rejected by DTO validation; window must be coherent; the sum
 * of reported millis cannot exceed the window length plus a small clock
 * tolerance; totals cannot exceed plausible elapsed time since the
 * session started; batches are rejected after finalization; duplicate
 * clientBatchIds are acknowledged but never double-counted (guarded both
 * by a lookup and by the DB unique constraint for race conditions).
 */
@Service
public class FocusAggregationService {

    private final StudySessionRepository studySessionRepository;
    private final FocusBatchRepository focusBatchRepository;
    private final StudySessionService studySessionService;
    private final Clock clock;

    public FocusAggregationService(StudySessionRepository studySessionRepository,
                                   FocusBatchRepository focusBatchRepository,
                                   StudySessionService studySessionService,
                                   Clock clock) {
        this.studySessionRepository = studySessionRepository;
        this.focusBatchRepository = focusBatchRepository;
        this.studySessionService = studySessionService;
        this.clock = clock;
    }

    @Transactional
    public FocusBatchAck recordBatch(String userUid, Long sessionId, FocusBatchRequest request) {
        StudySession session = studySessionService.requireOwnedSession(userUid, sessionId);

        // Focus totals may never change after finalization.
        if (session.getStatus().isFinal()) {
            throw new InvalidFocusBatchException(
                    "Session is already finalized; focus data can no longer be added");
        }

        validateWindow(request);
        validatePlausibleElapsed(session, request);

        // Duplicate handling: acknowledge without counting twice.
        if (focusBatchRepository.existsByStudySessionIdAndClientBatchId(sessionId, request.getClientBatchId())) {
            return new FocusBatchAck(request.getClientBatchId(), false, true);
        }

        FocusBatch batch = new FocusBatch();
        batch.setStudySession(session);
        batch.setClientBatchId(request.getClientBatchId());
        batch.setWindowStartedAt(request.getWindowStartedAt());
        batch.setWindowEndedAt(request.getWindowEndedAt());
        batch.setFocusedMilliseconds(request.getFocusedMilliseconds());
        batch.setDistractedMilliseconds(request.getDistractedMilliseconds());
        batch.setNoFaceMilliseconds(request.getNoFaceMilliseconds());
        batch.setMultipleFaceMilliseconds(request.getMultipleFaceMilliseconds());
        batch.setCameraUnavailableMilliseconds(request.getCameraUnavailableMilliseconds());
        batch.setPhoneMilliseconds(request.getPhoneMilliseconds());
        batch.setDrowsyMilliseconds(request.getDrowsyMilliseconds());

        try {
            focusBatchRepository.saveAndFlush(batch);
        } catch (DataIntegrityViolationException ex) {
            // Race: an identical clientBatchId was inserted between the
            // exists-check and this insert. Treat as duplicate, not error.
            return new FocusBatchAck(request.getClientBatchId(), false, true);
        }

        // Aggregate into the session counters (stored in whole seconds).
        session.setFocusedSeconds(session.getFocusedSeconds()
                + millisToSeconds(request.getFocusedMilliseconds()));
        session.setDistractedSeconds(session.getDistractedSeconds()
                + millisToSeconds(request.getDistractedMilliseconds()));
        session.setNoFaceSeconds(session.getNoFaceSeconds()
                + millisToSeconds(request.getNoFaceMilliseconds()));
        session.setMultipleFaceSeconds(session.getMultipleFaceSeconds()
                + millisToSeconds(request.getMultipleFaceMilliseconds()));
        session.setCameraUnavailableSeconds(session.getCameraUnavailableSeconds()
                + millisToSeconds(request.getCameraUnavailableMilliseconds()));
        session.setPhoneSeconds(session.getPhoneSeconds()
                + millisToSeconds(request.getPhoneMilliseconds()));
        session.setDrowsySeconds(session.getDrowsySeconds()
                + millisToSeconds(request.getDrowsyMilliseconds()));

        studySessionRepository.save(session);

        return new FocusBatchAck(request.getClientBatchId(), true, false);
    }

    private void validateWindow(FocusBatchRequest request) {
        if (!request.getWindowEndedAt().isAfter(request.getWindowStartedAt())) {
            throw new InvalidFocusBatchException("windowEndedAt must be after windowStartedAt");
        }

        long windowMillis = Duration.between(request.getWindowStartedAt(), request.getWindowEndedAt()).toMillis();
        long reportedMillis = totalReportedMillis(request);

        if (reportedMillis > windowMillis + FocusPolicy.BATCH_CLOCK_TOLERANCE_MILLIS) {
            throw new InvalidFocusBatchException(
                    "Reported focus time exceeds the reporting window duration");
        }
    }

    /** Total monitored time can never exceed real elapsed time since session start. */
    private void validatePlausibleElapsed(StudySession session, FocusBatchRequest request) {
        Instant now = clock.instant();
        long elapsedSinceStartMillis = Math.max(0, Duration.between(session.getStartedAt(), now).toMillis());

        long alreadyRecordedMillis = (session.getFocusedSeconds()
                + session.getDistractedSeconds()
                + session.getNoFaceSeconds()
                + session.getMultipleFaceSeconds()
                + session.getCameraUnavailableSeconds()
                + session.getPhoneSeconds()
                + session.getDrowsySeconds()) * 1000;

        long newTotal = alreadyRecordedMillis + totalReportedMillis(request);

        if (newTotal > elapsedSinceStartMillis + FocusPolicy.BATCH_CLOCK_TOLERANCE_MILLIS) {
            throw new InvalidFocusBatchException(
                    "Reported focus time exceeds plausible elapsed session time");
        }
    }

    private long totalReportedMillis(FocusBatchRequest request) {
        return request.getFocusedMilliseconds()
                + request.getDistractedMilliseconds()
                + request.getNoFaceMilliseconds()
                + request.getMultipleFaceMilliseconds()
                + request.getCameraUnavailableMilliseconds()
                + request.getPhoneMilliseconds()
                + request.getDrowsyMilliseconds();
    }

    private long millisToSeconds(long millis) {
        return Math.round(millis / 1000.0);
    }
}
