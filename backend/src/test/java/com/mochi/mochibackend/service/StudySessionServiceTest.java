package com.mochi.mochibackend.service;

import com.mochi.mochibackend.dailygoal.service.DailyGoalService;
import com.mochi.mochibackend.dto.RoomAnalyticsResponse;
import com.mochi.mochibackend.dto.StartSessionRequest;
import com.mochi.mochibackend.exception.ActiveSessionExistsException;
import com.mochi.mochibackend.exception.InvalidSessionRequestException;
import com.mochi.mochibackend.exception.InvalidSessionStateException;
import com.mochi.mochibackend.exception.SessionNotFoundException;
import com.mochi.mochibackend.exception.TaskNotFoundException;
import com.mochi.mochibackend.model.SessionClassification;
import com.mochi.mochibackend.model.SessionStatus;
import com.mochi.mochibackend.model.StudySession;
import com.mochi.mochibackend.pet.service.RewardService;
import com.mochi.mochibackend.repository.StudySessionRepository;
import com.mochi.mochibackend.task.entity.Task;
import com.mochi.mochibackend.achievement.service.AchievementService;
import com.mochi.mochibackend.task.service.TaskService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class StudySessionServiceTest {

    private static final String UID = "user-abc";
    private static final Instant NOW = Instant.parse("2026-07-12T10:00:00Z");

    @Mock
    private StudySessionRepository repository;

    @Mock
    private com.mochi.mochibackend.repository.FocusBatchRepository focusBatchRepository;

    @Mock
    private com.mochi.mochibackend.repository.CoStudyRoomRepository coStudyRoomRepository;

    @Mock
    private RewardService rewardService;

    @Mock
    private DailyGoalService dailyGoalService;

    @Mock
    private TaskService taskService;

    @Mock
    private AchievementService achievementService;

    private StudySessionService service;
    private MutableClock clock;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(NOW);
        service = new StudySessionService(repository, focusBatchRepository, coStudyRoomRepository, clock, rewardService, dailyGoalService, taskService, achievementService);

        // Most tests persist by returning the same instance.
        lenient().when(repository.save(any(StudySession.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(repository.saveAndFlush(any(StudySession.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    // ---------- start ----------

    @Test
    void startCreatesRunningSessionWithServerTimestamps() {
        when(repository.findFirstByUserUidAndStatusIn(eq(UID), anyCollection()))
                .thenReturn(Optional.empty());

        StudySession session = service.start(UID, request(25));

        assertThat(session.getStatus()).isEqualTo(SessionStatus.RUNNING);
        assertThat(session.getPlannedDurationSeconds()).isEqualTo(1500);
        assertThat(session.getStartedAt()).isEqualTo(NOW);
        assertThat(session.getLastResumedAt()).isEqualTo(NOW);
        assertThat(session.getActiveMarker()).isTrue();
        assertThat(session.getUserUid()).isEqualTo(UID);
    }

    @Test
    void startRejectsDurationBelowFiveMinutes() {
        assertThatThrownBy(() -> service.start(UID, request(4)))
                .isInstanceOf(InvalidSessionRequestException.class);
        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void startRejectsWhenActiveSessionExists() {
        when(repository.findFirstByUserUidAndStatusIn(eq(UID), anyCollection()))
                .thenReturn(Optional.of(runningSession(1500, 0)));

        assertThatThrownBy(() -> service.start(UID, request(25)))
                .isInstanceOf(ActiveSessionExistsException.class);
    }

    @Test
    void startWithOwnedTaskLinksItAfterValidation() {
        when(taskService.getOwned(UID, 7L)).thenReturn(new Task());
        when(repository.findFirstByUserUidAndStatusIn(eq(UID), anyCollection()))
                .thenReturn(Optional.empty());

        StudySession session = service.start(UID, request(25, 7L));

        assertThat(session.getTaskId()).isEqualTo(7L);
        verify(taskService).getOwned(UID, 7L);
    }

    @Test
    void startRejectsAnotherUsersOrUnknownTaskId() {
        when(taskService.getOwned(UID, 99L)).thenThrow(new TaskNotFoundException("Task not found"));

        assertThatThrownBy(() -> service.start(UID, request(25, 99L)))
                .isInstanceOf(TaskNotFoundException.class);
        verify(repository, never()).saveAndFlush(any());
    }

    // ---------- pause / resume ----------

    @Test
    void pauseCommitsElapsedStudyTimeFromServerClock() {
        StudySession running = runningSession(1500, 0);
        stubOwned(running);

        clock.advance(Duration.ofSeconds(120)); // 2 minutes pass on the server
        StudySession paused = service.pause(UID, 1L);

        assertThat(paused.getStatus()).isEqualTo(SessionStatus.PAUSED);
        assertThat(paused.getAccumulatedStudySeconds()).isEqualTo(120);
        assertThat(paused.getPausedAt()).isEqualTo(clock.instant());
        assertThat(paused.getLastResumedAt()).isNull();
    }

    @Test
    void pauseRejectsAlreadyPausedSession() {
        StudySession paused = runningSession(1500, 0);
        paused.setStatus(SessionStatus.PAUSED);
        stubOwned(paused);

        assertThatThrownBy(() -> service.pause(UID, 1L))
                .isInstanceOf(InvalidSessionStateException.class);
    }

    @Test
    void resumeAccumulatesPausedTimeAndRestartsClock() {
        StudySession session = runningSession(1500, 300);
        session.setStatus(SessionStatus.PAUSED);
        session.setPausedAt(NOW);
        session.setLastResumedAt(null);
        stubOwned(session);

        clock.advance(Duration.ofSeconds(60));
        StudySession resumed = service.resume(UID, 1L);

        assertThat(resumed.getStatus()).isEqualTo(SessionStatus.RUNNING);
        assertThat(resumed.getTotalPausedSeconds()).isEqualTo(60);
        assertThat(resumed.getLastResumedAt()).isEqualTo(clock.instant());
        assertThat(resumed.getPausedAt()).isNull();
    }

    @Test
    void resumeRejectsRunningSession() {
        stubOwned(runningSession(1500, 0));

        assertThatThrownBy(() -> service.resume(UID, 1L))
                .isInstanceOf(InvalidSessionStateException.class);
    }

    // ---------- complete / stop ----------

    @Test
    void normalCompletionClampsStudyTimeAndClassifiesValid() {
        StudySession session = runningSession(1500, 0);
        session.setFocusedSeconds(1200);
        session.setDistractedSeconds(100);
        stubOwned(session);

        clock.advance(Duration.ofSeconds(1500)); // full planned time elapses
        StudySession done = service.complete(UID, 1L);

        assertThat(done.getStatus()).isEqualTo(SessionStatus.COMPLETED);
        assertThat(done.getAccumulatedStudySeconds()).isEqualTo(1500); // clamped
        assertThat(done.getCompletionRatio()).isEqualTo(1.0);
        assertThat(done.getFocusScore()).isEqualTo(92); // 1200/1300
        assertThat(done.getSessionClassification()).isEqualTo(SessionClassification.VALID);
        assertThat(done.getActiveMarker()).isNull();
        assertThat(done.getEndedAt()).isEqualTo(clock.instant());
        verify(rewardService).applyStudySessionCompletionReward(UID, 1500L, false);
    }

    @Test
    void completionOfRoomLinkedSessionPassesRoomBonusFlag() {
        StudySession session = runningSession(1500, 0);
        session.setRoomId("room-abc");
        session.setFocusedSeconds(1200);
        session.setDistractedSeconds(100);
        stubOwned(session);

        clock.advance(Duration.ofSeconds(1500));
        service.complete(UID, 1L);

        // isRoomSession=true is the only thing that differs from a solo
        // completion — RewardService itself (RewardServiceTest) is
        // where the actual 1.5x multiplier math is verified; this test
        // only proves StudySessionService correctly detects "this
        // session has a roomId" and passes that through.
        verify(rewardService).applyStudySessionCompletionReward(UID, 1500L, true);
    }

    // ---------- voidRoomSessions ("all must finish" policy) ----------

    @Test
    void voidRoomSessionsStopsEveryActiveSessionAndGrantsNoReward() {
        StudySession a = runningSession(1500, 300);
        a.setId(1L);
        a.setRoomId("room-xyz");
        StudySession b = runningSession(1500, 600);
        b.setId(2L);
        b.setUserUid("user-def");
        b.setRoomId("room-xyz");

        when(coStudyRoomRepository.findHostUserId("room-xyz")).thenReturn(Optional.of(UID));
        when(repository.findAllByRoomIdAndStatusIn(eq("room-xyz"), anyCollection()))
                .thenReturn(java.util.List.of(a, b));
        when(repository.saveAll(anyCollection())).thenAnswer(invocation -> invocation.getArgument(0));

        var voided = service.voidRoomSessions("room-xyz", UID);

        assertThat(voided).hasSize(2);
        assertThat(voided).allSatisfy(session -> {
            assertThat(session.getStatus()).isEqualTo(SessionStatus.STOPPED);
            assertThat(session.getActiveMarker()).isNull();
        });
        // stop() (and this, which shares its finalize path) never calls
        // the reward pipeline — only complete() does, and STOPPED
        // sessions can never reach complete() afterwards either
        // (InvalidSessionStateException, see stopRejectsCompletedSession-style
        // guards above).
        verify(rewardService, never()).applyStudySessionCompletionReward(anyString(), anyLong(), anyBoolean());
    }

    @Test
    void voidRoomSessionsRejectsNonHostCaller() {
        when(coStudyRoomRepository.findHostUserId("room-xyz")).thenReturn(Optional.of("someone-else"));

        assertThatThrownBy(() -> service.voidRoomSessions("room-xyz", UID))
                .isInstanceOf(com.mochi.mochibackend.exception.NotRoomHostException.class);
    }

    @Test
    void voidRoomSessionsRejectsUnknownRoom() {
        when(coStudyRoomRepository.findHostUserId("ghost-room")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.voidRoomSessions("ghost-room", UID))
                .isInstanceOf(com.mochi.mochibackend.exception.CoStudyRoomNotFoundException.class);
    }

    // ---------- getFocusTimeline ----------

    @Test
    void getFocusTimelineReturnsOwnedSessionsBatchesInOrder() {
        StudySession session = runningSession(1500, 300);
        stubOwned(session);
        var batches = java.util.List.<com.mochi.mochibackend.model.FocusBatch>of(
                new com.mochi.mochibackend.model.FocusBatch(), new com.mochi.mochibackend.model.FocusBatch());
        when(focusBatchRepository.findAllByStudySessionIdOrderByWindowStartedAtAsc(1L)).thenReturn(batches);

        var result = service.getFocusTimeline(UID, 1L);

        assertThat(result).isSameAs(batches);
    }

    @Test
    void getFocusTimelineRejectsSessionOwnedByAnotherUser() {
        // requireOwnedSession calls findByIdAndUserUid(id, UID) — left
        // unstubbed here (as if session 1 belongs to someone else), a
        // Mockito mock returns Optional.empty() by default, which is
        // exactly the "not found for this user" case being tested.
        assertThatThrownBy(() -> service.getFocusTimeline(UID, 1L))
                .isInstanceOf(com.mochi.mochibackend.exception.SessionNotFoundException.class);
    }

    @Test
    void validCompletionOfLinkedSessionAutoCompletesTheTask() {
        StudySession session = runningSession(1500, 0);
        session.setTaskId(7L);
        session.setFocusedSeconds(1200);
        session.setDistractedSeconds(100);
        stubOwned(session);

        clock.advance(Duration.ofSeconds(1500));
        service.complete(UID, 1L);

        verify(taskService).complete(UID, 7L);
    }

    @Test
    void nonValidCompletionOfLinkedSessionDoesNotAutoCompleteTheTask() {
        // Half the planned time, weak focus -> PARTIAL, not VALID.
        StudySession session = runningSession(1500, 0);
        session.setTaskId(7L);
        session.setFocusedSeconds(200);
        session.setDistractedSeconds(500);
        stubOwned(session);

        clock.advance(Duration.ofSeconds(750));
        StudySession done = service.complete(UID, 1L);

        assertThat(done.getSessionClassification()).isNotEqualTo(SessionClassification.VALID);
        verify(taskService, never()).complete(anyString(), anyLong());
    }

    @Test
    void duplicateCompleteRequestIsIdempotentAndGrantsNoRepeatReward() {
        StudySession completed = runningSession(1500, 1500);
        completed.setTaskId(7L);
        completed.setStatus(SessionStatus.COMPLETED);
        completed.setLastResumedAt(null);
        stubOwned(completed);

        StudySession result = service.complete(UID, 1L);

        assertThat(result.getStatus()).isEqualTo(SessionStatus.COMPLETED);
        verify(repository, never()).save(any());
        verify(rewardService, never()).applyStudySessionCompletionReward(anyString(), anyLong(), anyBoolean());
        verify(taskService, never()).complete(anyString(), anyLong());
    }

    @Test
    void earlyStopClassifiesPartialWhenHalfDoneWithDecentFocus() {
        StudySession session = runningSession(1500, 0);
        session.setFocusedSeconds(500);
        session.setDistractedSeconds(300);
        stubOwned(session);

        clock.advance(Duration.ofSeconds(900)); // stopped at 60%
        StudySession stopped = service.stop(UID, 1L);

        assertThat(stopped.getStatus()).isEqualTo(SessionStatus.STOPPED);
        assertThat(stopped.getAccumulatedStudySeconds()).isEqualTo(900);
        assertThat(stopped.getCompletionRatio()).isEqualTo(0.6);
        assertThat(stopped.getFocusScore()).isEqualTo(63); // 500/800
        assertThat(stopped.getSessionClassification()).isEqualTo(SessionClassification.PARTIAL);
    }

    @Test
    void stoppingALinkedSessionNeverAutoCompletesTheTask() {
        StudySession session = runningSession(1500, 0);
        session.setTaskId(7L);
        session.setFocusedSeconds(1400);
        stubOwned(session);

        clock.advance(Duration.ofSeconds(1500));
        service.stop(UID, 1L);

        verify(taskService, never()).complete(anyString(), anyLong());
    }

    @Test
    void veryEarlyStopClassifiesInvalid() {
        StudySession session = runningSession(1500, 0);
        session.setFocusedSeconds(60);
        stubOwned(session);

        clock.advance(Duration.ofSeconds(120)); // stopped at 8%
        StudySession stopped = service.stop(UID, 1L);

        assertThat(stopped.getSessionClassification()).isEqualTo(SessionClassification.INVALID);
    }

    @Test
    void completingAStoppedSessionIsRejected() {
        StudySession stopped = runningSession(1500, 100);
        stopped.setStatus(SessionStatus.STOPPED);
        stubOwned(stopped);

        assertThatThrownBy(() -> service.complete(UID, 1L))
                .isInstanceOf(InvalidSessionStateException.class);
    }

    // ---------- ownership ----------

    @Test
    void accessingAnotherUsersSessionBehavesAsNotFound() {
        when(repository.findByIdAndUserUid(anyLong(), anyString()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.pause(UID, 99L))
                .isInstanceOf(SessionNotFoundException.class);
    }

    // ---------- Study Rooms Phase 5: room analytics ----------

    @Test
    void roomAnalyticsAggregatesAcrossRoomLinkedSessionsOnly() {
        StudySession roomSessionA = roomLinkedSession("room-1", 1200, NOW.minus(Duration.ofDays(1)));
        StudySession roomSessionB = roomLinkedSession("room-1", 900, NOW.minus(Duration.ofDays(1)));
        StudySession roomSessionC = roomLinkedSession("room-2", 1800, NOW.minus(Duration.ofDays(3)));
        when(repository.findAllByUserUidAndRoomIdIsNotNullOrderByCreatedAtDesc(UID))
                .thenReturn(java.util.List.of(roomSessionC, roomSessionA, roomSessionB));

        RoomAnalyticsResponse response = service.getRoomAnalytics(UID);

        assertThat(response.getTotalRoomSessions()).isEqualTo(3);
        assertThat(response.getTotalRoomStudySeconds()).isEqualTo(1200 + 900 + 1800);
        assertThat(response.getDistinctRoomsJoined()).isEqualTo(2);
        assertThat(response.getDistinctActiveDays()).isEqualTo(2);
        // (1200+900)/60 + 1800/60 = 35 + 30 = 65 total minutes over 3 sessions
        assertThat(response.getAverageSessionMinutes()).isCloseTo(65.0 / 3, org.assertj.core.data.Offset.offset(0.01));
    }

    @Test
    void roomAnalyticsIsEmptyWhenUserHasNoRoomLinkedSessions() {
        when(repository.findAllByUserUidAndRoomIdIsNotNullOrderByCreatedAtDesc(UID))
                .thenReturn(java.util.List.of());

        RoomAnalyticsResponse response = service.getRoomAnalytics(UID);

        assertThat(response.getTotalRoomSessions()).isZero();
        assertThat(response.getTotalRoomStudySeconds()).isZero();
        assertThat(response.getDistinctRoomsJoined()).isZero();
        assertThat(response.getAverageSessionMinutes()).isZero();
        assertThat(response.getRecentDailyMinutes()).isEmpty();
    }

    // ---------- helpers ----------

    private void stubOwned(StudySession session) {
        when(repository.findByIdAndUserUid(1L, UID)).thenReturn(Optional.of(session));
    }

    private StartSessionRequest request(int minutes) {
        return request(minutes, null);
    }

    private StartSessionRequest request(int minutes, Long taskId) {
        StartSessionRequest req = new StartSessionRequest();
        req.setPlannedDurationMinutes(minutes);
        req.setTaskId(taskId);
        return req;
    }

    private StudySession runningSession(int plannedSeconds, long accumulated) {
        StudySession session = new StudySession();
        session.setId(1L);
        session.setUserUid(UID);
        session.setPlannedDurationSeconds(plannedSeconds);
        session.setAccumulatedStudySeconds(accumulated);
        session.setStatus(SessionStatus.RUNNING);
        session.setActiveMarker(Boolean.TRUE);
        session.setStartedAt(NOW.minusSeconds(accumulated));
        session.setLastResumedAt(NOW);
        return session;
    }

    /** A finalized, room-linked session for Phase 5 analytics tests — createdAt is set explicitly since @CreationTimestamp doesn't fire outside a real persistence context. */
    private StudySession roomLinkedSession(String roomId, long accumulatedSeconds, Instant createdAt) {
        StudySession session = new StudySession();
        session.setUserUid(UID);
        session.setRoomId(roomId);
        session.setAccumulatedStudySeconds(accumulatedSeconds);
        session.setStatus(SessionStatus.COMPLETED);
        session.setCreatedAt(createdAt);
        return session;
    }

    /** Minimal controllable clock so elapsed time is fully deterministic. */
    private static class MutableClock extends Clock {
        private Instant instant;

        MutableClock(Instant start) {
            this.instant = start;
        }

        void advance(Duration duration) {
            instant = instant.plus(duration);
        }

        @Override
        public Instant instant() {
            return instant;
        }

        @Override
        public java.time.ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }
    }
}