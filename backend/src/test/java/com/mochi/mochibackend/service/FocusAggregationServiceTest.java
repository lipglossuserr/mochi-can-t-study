package com.mochi.mochibackend.service;

import com.mochi.mochibackend.achievement.service.AchievementService;
import com.mochi.mochibackend.dailygoal.service.DailyGoalService;
import com.mochi.mochibackend.dto.FocusBatchAck;
import com.mochi.mochibackend.dto.FocusBatchRequest;
import com.mochi.mochibackend.exception.InvalidFocusBatchException;
import com.mochi.mochibackend.model.SessionStatus;
import com.mochi.mochibackend.model.StudySession;
import com.mochi.mochibackend.pet.service.RewardService;
import com.mochi.mochibackend.repository.CoStudyRoomRepository;
import com.mochi.mochibackend.repository.FocusBatchRepository;
import com.mochi.mochibackend.repository.StudySessionRepository;
import com.mochi.mochibackend.task.service.TaskService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FocusAggregationServiceTest {

    private static final String UID = "user-abc";
    private static final Instant NOW = Instant.parse("2026-07-12T10:05:00Z");

    @Mock
    private StudySessionRepository sessionRepository;

    @Mock
    private FocusBatchRepository batchRepository;

    @Mock
    private CoStudyRoomRepository coStudyRoomRepository;

    private FocusAggregationService service;
    private StudySession session;

    @BeforeEach
    void setUp() {
        Clock fixed = Clock.fixed(NOW, ZoneOffset.UTC);
        StudySessionService sessionService =
                new StudySessionService(
                        sessionRepository,
                        batchRepository,
                        coStudyRoomRepository,
                        fixed,
                        org.mockito.Mockito.mock(RewardService.class),
                        org.mockito.Mockito.mock(DailyGoalService.class),
                        org.mockito.Mockito.mock(TaskService.class),
                        org.mockito.Mockito.mock(AchievementService.class));
        service = new FocusAggregationService(sessionRepository, batchRepository, sessionService, fixed);

        session = new StudySession();
        session.setId(1L);
        session.setUserUid(UID);
        session.setPlannedDurationSeconds(1500);
        session.setStatus(SessionStatus.RUNNING);
        session.setStartedAt(NOW.minusSeconds(300)); // 5 minutes of real elapsed time

        lenient().when(sessionRepository.findByIdAndUserUid(1L, UID)).thenReturn(Optional.of(session));
        lenient().when(sessionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(batchRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void validBatchIsAcceptedAndAggregated() {
        when(batchRepository.existsByStudySessionIdAndClientBatchId(1L, "b1")).thenReturn(false);

        FocusBatchAck ack = service.recordBatch(UID, 1L, batch("b1", 12_000, 3_000));

        assertThat(ack.isAccepted()).isTrue();
        assertThat(ack.isDuplicate()).isFalse();
        assertThat(session.getFocusedSeconds()).isEqualTo(12);
        assertThat(session.getDistractedSeconds()).isEqualTo(3);
    }

    @Test
    void duplicateClientBatchIdIsAcknowledgedButNotCountedTwice() {
        when(batchRepository.existsByStudySessionIdAndClientBatchId(1L, "b1")).thenReturn(true);

        FocusBatchAck ack = service.recordBatch(UID, 1L, batch("b1", 12_000, 3_000));

        assertThat(ack.isDuplicate()).isTrue();
        assertThat(session.getFocusedSeconds()).isZero(); // never aggregated
        verify(batchRepository, never()).saveAndFlush(any());
    }

    @Test
    void batchExceedingWindowDurationIsRejected() {
        // 15s window but 20s reported — beyond the 2s tolerance
        FocusBatchRequest bad = batch("b1", 18_000, 2_000);

        assertThatThrownBy(() -> service.recordBatch(UID, 1L, bad))
                .isInstanceOf(InvalidFocusBatchException.class);
    }

    @Test
    void batchExceedingPlausibleElapsedSessionTimeIsRejected() {
        // Session started 300s ago, but 250s were already recorded; a
        // further 15s x several batches would exceed real elapsed time.
        session.setFocusedSeconds(295);

        assertThatThrownBy(() -> service.recordBatch(UID, 1L, batch("b1", 14_000, 1_000)))
                .isInstanceOf(InvalidFocusBatchException.class);
    }

    @Test
    void batchesAreRejectedAfterFinalization() {
        session.setStatus(SessionStatus.COMPLETED);

        assertThatThrownBy(() -> service.recordBatch(UID, 1L, batch("b1", 1_000, 0)))
                .isInstanceOf(InvalidFocusBatchException.class);
    }

    private FocusBatchRequest batch(String id, long focusedMs, long distractedMs) {
        FocusBatchRequest request = new FocusBatchRequest();
        request.setClientBatchId(id);
        request.setWindowStartedAt(NOW.minusSeconds(15));
        request.setWindowEndedAt(NOW);
        request.setFocusedMilliseconds(focusedMs);
        request.setDistractedMilliseconds(distractedMs);
        return request;
    }
}
