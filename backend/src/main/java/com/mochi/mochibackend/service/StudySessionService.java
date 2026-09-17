package com.mochi.mochibackend.service;

import com.mochi.mochibackend.achievement.service.AchievementService;
import com.mochi.mochibackend.config.FocusPolicy;
import com.mochi.mochibackend.dailygoal.service.DailyGoalService;
import com.mochi.mochibackend.dto.RoomAnalyticsResponse;
import com.mochi.mochibackend.dto.StartSessionRequest;
import com.mochi.mochibackend.exception.ActiveSessionExistsException;
import com.mochi.mochibackend.exception.InvalidSessionRequestException;
import com.mochi.mochibackend.exception.InvalidSessionStateException;
import com.mochi.mochibackend.exception.SessionNotFoundException;
import com.mochi.mochibackend.model.SessionClassification;
import com.mochi.mochibackend.model.SessionStatus;
import com.mochi.mochibackend.model.StudySession;
import com.mochi.mochibackend.pet.entity.Pet;
import com.mochi.mochibackend.pet.service.RewardService;
import com.mochi.mochibackend.exception.CoStudyRoomNotFoundException;
import com.mochi.mochibackend.exception.NotRoomHostException;
import com.mochi.mochibackend.repository.CoStudyRoomRepository;
import com.mochi.mochibackend.repository.StudySessionRepository;
import com.mochi.mochibackend.task.service.TaskService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.stream.Collectors;

/**
 * All study-session lifecycle logic. The server is authoritative:
 * elapsed time is always derived from server timestamps captured here,
 * never accepted from the client. Final metrics (focus score, completion
 * ratio, classification) are computed exclusively at finalization from
 * {@link FocusPolicy}.
 * <p>
 * Concurrency safety:
 * <ul>
 *   <li>The DB unique constraint (user_uid, active_marker) makes two
 *       simultaneous active sessions impossible even under racing
 *       requests from multiple tabs.</li>
 *   <li>{@code @Version} optimistic locking rejects lost updates.</li>
 *   <li>Complete and Stop are idempotent: repeating the same finalization
 *       returns the already-final session instead of erroring.</li>
 * </ul>
 */
@Service
public class StudySessionService {

    private static final EnumSet<SessionStatus> ACTIVE_STATUSES =
            EnumSet.of(SessionStatus.RUNNING, SessionStatus.PAUSED);

    private final StudySessionRepository studySessionRepository;
    private final com.mochi.mochibackend.repository.FocusBatchRepository focusBatchRepository;
    private final CoStudyRoomRepository coStudyRoomRepository;
    private final Clock clock;
    private final RewardService rewardService;
    private final DailyGoalService dailyGoalService;
    private final TaskService taskService;
    private final AchievementService achievementService;

    public StudySessionService(StudySessionRepository studySessionRepository,
                               com.mochi.mochibackend.repository.FocusBatchRepository focusBatchRepository,
                               CoStudyRoomRepository coStudyRoomRepository,
                               Clock clock,
                               RewardService rewardService,
                               DailyGoalService dailyGoalService,
                               TaskService taskService,
                               AchievementService achievementService) {
        this.studySessionRepository = studySessionRepository;
        this.focusBatchRepository = focusBatchRepository;
        this.coStudyRoomRepository = coStudyRoomRepository;
        this.clock = clock;
        this.rewardService = rewardService;
        this.dailyGoalService = dailyGoalService;
        this.taskService = taskService;
        this.achievementService = achievementService;
    }

    @Transactional
    public StudySession start(String userUid, StartSessionRequest request) {
        int plannedSeconds = request.getPlannedDurationMinutes() * 60;

        // Backend re-validation: never rely on frontend validation alone.
        if (plannedSeconds < FocusPolicy.MIN_DURATION_SECONDS) {
            throw new InvalidSessionRequestException(
                    "Study sessions must be at least 5 minutes (300 seconds)");
        }

        // Sprint 7.2B: an unknown or another user's task id is rejected
        // the same way TaskController rejects it directly — reusing
        // TaskService.getOwned means "not yours" and "doesn't exist"
        // stay indistinguishable everywhere in this codebase, not just
        // in the tasks feature itself.
        if (request.getTaskId() != null) {
            taskService.getOwned(userUid, request.getTaskId());
        }

        if (studySessionRepository.findFirstByUserUidAndStatusIn(userUid, ACTIVE_STATUSES).isPresent()) {
            throw new ActiveSessionExistsException(
                    "You already have an active study session. Finish or stop it first.");
        }

        Instant now = clock.instant();

        StudySession session = new StudySession();
        session.setUserUid(userUid);
        session.setTaskId(request.getTaskId());
        session.setRoomId(request.getRoomId());
        session.setPlannedDurationSeconds(plannedSeconds);
        session.setStatus(SessionStatus.RUNNING);
        session.setActiveMarker(Boolean.TRUE);
        session.setStartedAt(now);
        session.setLastResumedAt(now);

        try {
            return studySessionRepository.saveAndFlush(session);
        } catch (DataIntegrityViolationException ex) {
            // A racing request (double-click, second tab) won the unique
            // constraint on (user_uid, active_marker) first. (A bad
            // taskId can no longer reach this catch block — it's
            // rejected above, before any insert is attempted.)
            throw new ActiveSessionExistsException(
                    "You already have an active study session. Finish or stop it first.");
        }
    }

    @Transactional
    public StudySession pause(String userUid, Long sessionId) {
        StudySession session = requireOwnedSession(userUid, sessionId);

        if (session.getStatus() != SessionStatus.RUNNING) {
            throw new InvalidSessionStateException(
                    "Only a RUNNING session can be paused (current status: " + session.getStatus() + ")");
        }

        Instant now = clock.instant();
        session.setAccumulatedStudySeconds(
                session.getAccumulatedStudySeconds() + elapsedSeconds(session.getLastResumedAt(), now));
        session.setStatus(SessionStatus.PAUSED);
        session.setPausedAt(now);
        session.setLastResumedAt(null);

        return studySessionRepository.save(session);
    }

    @Transactional
    public StudySession resume(String userUid, Long sessionId) {
        StudySession session = requireOwnedSession(userUid, sessionId);

        if (session.getStatus() != SessionStatus.PAUSED) {
            throw new InvalidSessionStateException(
                    "Only a PAUSED session can be resumed (current status: " + session.getStatus() + ")");
        }

        Instant now = clock.instant();
        session.setTotalPausedSeconds(
                session.getTotalPausedSeconds() + elapsedSeconds(session.getPausedAt(), now));
        session.setStatus(SessionStatus.RUNNING);
        session.setLastResumedAt(now);
        session.setPausedAt(null);

        return studySessionRepository.save(session);
    }

    /**
     * Normal completion (timer reached zero). Idempotent: completing an
     * already COMPLETED session returns it unchanged and grants no
     * further reward — {@link RewardService} is only invoked on the one
     * transition into COMPLETED below, never on this early return, so a
     * repeated completion request can never reward the pet twice. The
     * same guard protects {@link DailyGoalService#recordStudyMinutes}
     * and, as of Sprint 7.2B, {@link TaskService#complete} too: a
     * duplicate completion request can never double-fire any of them.
     * Studied time is clamped to the planned duration — a client cannot
     * inflate it.
     */
    @Transactional
    public StudySession complete(String userUid, Long sessionId) {
        StudySession session = requireOwnedSession(userUid, sessionId);

        if (session.getStatus() == SessionStatus.COMPLETED) {
            return session; // duplicate Complete request — idempotent, no reward re-granted
        }
        if (session.getStatus() == SessionStatus.STOPPED) {
            throw new InvalidSessionStateException("Session was already stopped and cannot be completed");
        }

        Instant now = clock.instant();
        commitRunningTime(session, now);
        session.setAccumulatedStudySeconds(
                Math.min(session.getAccumulatedStudySeconds(), session.getPlannedDurationSeconds()));

        finalize(session, SessionStatus.COMPLETED, now);
        StudySession saved = studySessionRepository.save(session);

        // Pet rewards only ever fire from this one real completion path.
        Pet rewardedPet = rewardService.applyStudySessionCompletionReward(
                userUid, saved.getAccumulatedStudySeconds(), saved.getRoomId() != null);

        // Daily-goal progress and task auto-completion only count a
        // session the same way the sprint defines "valid" study time —
        // a PARTIAL/INVALID session grants no STUDY_MINUTES progress and
        // auto-completes no task, same as it grants no reward multiplier
        // bonus. Unlike the reward above (which scales with any
        // completed time), this is a hard gate, not a scaling factor.
        if (saved.getSessionClassification() == SessionClassification.VALID) {
            int studiedMinutes = (int) (saved.getAccumulatedStudySeconds() / 60);
            dailyGoalService.recordStudyMinutes(userUid, studiedMinutes);

            // Sprint 7.2B: the behavior TaskService's own javadoc called
            // out as deliberately missing. taskService.complete is
            // already idempotent (repeat calls are a no-op), so this is
            // safe even if the linked task was somehow already done.
            if (saved.getTaskId() != null) {
                taskService.complete(userUid, saved.getTaskId());
            }
        }

        // Achievement unlocks read the pet RewardService just saved
        // (streak/level) plus a fresh completed-session/task count —
        // taken last so this session's own task auto-completion above
        // is reflected in a tasks-completed criterion. Never mutates or
        // re-saves the pet or session.
        achievementService.checkAndUnlock(userUid, rewardedPet);

        return saved;
    }

    /**
     * Early stop by the user. Idempotent: stopping an already STOPPED
     * session returns it unchanged. Deliberately does not touch the
     * linked task or daily goals — same as before Sprint 7.2B, an early
     * stop is never "valid" study time, so nothing downstream should
     * treat it as a finished task either.
     */
    @Transactional
    public StudySession stop(String userUid, Long sessionId) {
        StudySession session = requireOwnedSession(userUid, sessionId);

        if (session.getStatus() == SessionStatus.STOPPED) {
            return session; // duplicate Stop request — idempotent
        }
        if (session.getStatus() == SessionStatus.COMPLETED) {
            throw new InvalidSessionStateException("Session already completed and cannot be stopped");
        }

        Instant now = clock.instant();
        commitRunningTime(session, now);

        finalize(session, SessionStatus.STOPPED, now);
        return studySessionRepository.save(session);
    }

    /**
     * Study Rooms "all must finish" policy violation. Bulk-stops every
     * still-active session in the room at once, so no one who was still
     * connected keeps accumulating study time toward a reward the room
     * has already forfeited. Reuses {@link #stop}'s finalize path via
     * the same {@code finalize(..., SessionStatus.STOPPED, ...)} call —
     * STOPPED sessions never reach {@link #complete}, so this can never
     * grant a reward no matter what any individual participant's own
     * focus data looked like. Deliberately bypasses per-user ownership
     * ({@link #requireOwnedSession}) since this is the one legitimate
     * case in this service where one user's action finalizes another
     * user's session — authorization instead comes entirely from the
     * host check below, the same {@link CoStudyRoomRepository} pattern
     * {@code RoomModerationService} already uses for remove/mute.
     * Idempotent for the same reason {@link #stop} already is: any
     * session already COMPLETED or STOPPED by the time this runs (e.g.
     * a duplicate violation report racing a normal finish) is simply
     * skipped, not re-finalized or errored on.
     */
    @Transactional
    public List<StudySession> voidRoomSessions(String roomId, String callerUid) {
        String hostUserId = coStudyRoomRepository.findHostUserId(roomId)
                .orElseThrow(() -> new CoStudyRoomNotFoundException("Room not found: " + roomId));
        if (!hostUserId.equals(callerUid)) {
            throw new NotRoomHostException("Only the room's host can void the room's sessions.");
        }

        Instant now = clock.instant();
        List<StudySession> active = studySessionRepository.findAllByRoomIdAndStatusIn(roomId, ACTIVE_STATUSES);

        for (StudySession session : active) {
            commitRunningTime(session, now);
            finalize(session, SessionStatus.STOPPED, now);
        }

        return studySessionRepository.saveAll(active);
    }

    @Transactional(readOnly = true)
    public Optional<StudySession> findActive(String userUid) {
        return studySessionRepository.findFirstByUserUidAndStatusIn(userUid, ACTIVE_STATUSES);
    }

    @Transactional(readOnly = true)
    public StudySession getOwned(String userUid, Long sessionId) {
        return requireOwnedSession(userUid, sessionId);
    }

    /**
     * Session focus timeline graph — one point per recorded focus
     * batch, oldest first. Same ownership guard as every other
     * single-session lookup here; a session's raw focus history is
     * exactly as private as the session itself.
     */
    @Transactional(readOnly = true)
    public List<com.mochi.mochibackend.model.FocusBatch> getFocusTimeline(String userUid, Long sessionId) {
        requireOwnedSession(userUid, sessionId);
        return focusBatchRepository.findAllByStudySessionIdOrderByWindowStartedAtAsc(sessionId);
    }

    @Transactional(readOnly = true)
    public List<StudySession> findAllForUser(String userUid) {
        return studySessionRepository.findAllByUserUidOrderByCreatedAtDesc(userUid);
    }

    /**
     * Every session ever linked to a co-study room, in join order —
     * Study Rooms Phase 2. Deliberately not ownership-scoped like
     * {@link #requireOwnedSession}: a room summary is inherently
     * multi-user, the same way the room's own Firestore participant
     * list and chat already are to every member. The controller layer
     * doesn't restrict this to current room members either, matching
     * the room id itself being an unguessable Firestore-generated
     * token rather than a guessable/enumerable value.
     */
    @Transactional(readOnly = true)
    public List<StudySession> findAllForRoom(String roomId) {
        return studySessionRepository.findAllByRoomIdOrderByCreatedAtAsc(roomId);
    }

    /**
     * Personal Study Rooms analytics — Phase 5 (roadmap §6). Reads only
     * this user's own room-linked sessions; there's no cross-user
     * aggregation here (that would need an admin role this codebase
     * doesn't have — see RoomAnalyticsResponse's javadoc). Every session
     * counts toward totals regardless of status: a stopped-early session
     * still represents real study time the user gets credit for having
     * shown up, same as {@link #findAllForUser} makes no status
     * distinction either.
     */
    @Transactional(readOnly = true)
    public RoomAnalyticsResponse getRoomAnalytics(String userUid) {
        List<StudySession> sessions =
                studySessionRepository.findAllByUserUidAndRoomIdIsNotNullOrderByCreatedAtDesc(userUid);

        if (sessions.isEmpty()) {
            return new RoomAnalyticsResponse(0, 0L, 0, 0.0, 0, List.of());
        }

        long totalSeconds = sessions.stream().mapToLong(StudySession::getAccumulatedStudySeconds).sum();
        long distinctRooms = sessions.stream().map(StudySession::getRoomId).distinct().count();
        double averageMinutes = (totalSeconds / 60.0) / sessions.size();

        ZoneOffset utc = ZoneOffset.UTC;
        Map<LocalDate, Long> secondsByDay = new TreeMap<>();
        for (StudySession session : sessions) {
            LocalDate day = session.getCreatedAt().atZone(utc).toLocalDate();
            secondsByDay.merge(day, session.getAccumulatedStudySeconds(), Long::sum);
        }

        LocalDate cutoff = LocalDate.now(clock.withZone(utc)).minusDays(30);
        List<RoomAnalyticsResponse.DailyRoomMinutes> recentDaily = secondsByDay.entrySet().stream()
                .filter(entry -> !entry.getKey().isBefore(cutoff))
                .map(entry -> new RoomAnalyticsResponse.DailyRoomMinutes(
                        entry.getKey().toString(),
                        entry.getValue() / 60
                ))
                .collect(Collectors.toList());

        return new RoomAnalyticsResponse(
                sessions.size(),
                totalSeconds,
                (int) distinctRooms,
                averageMinutes,
                secondsByDay.size(),
                recentDaily
        );
    }

    // ------------------------------------------------------------------

    StudySession requireOwnedSession(String userUid, Long sessionId) {
        return studySessionRepository.findByIdAndUserUid(sessionId, userUid)
                .orElseThrow(() -> new SessionNotFoundException("Study session not found"));
    }

    /** If RUNNING, fold time since lastResumedAt into accumulatedStudySeconds. */
    private void commitRunningTime(StudySession session, Instant now) {
        if (session.getStatus() == SessionStatus.RUNNING && session.getLastResumedAt() != null) {
            session.setAccumulatedStudySeconds(
                    session.getAccumulatedStudySeconds() + elapsedSeconds(session.getLastResumedAt(), now));
            session.setLastResumedAt(null);
        }
        if (session.getStatus() == SessionStatus.PAUSED && session.getPausedAt() != null) {
            session.setTotalPausedSeconds(
                    session.getTotalPausedSeconds() + elapsedSeconds(session.getPausedAt(), now));
            session.setPausedAt(null);
        }
    }

    /** Server-side computation of every final metric. Never trusts the client. */
    private void finalize(StudySession session, SessionStatus finalStatus, Instant now) {
        session.setStatus(finalStatus);
        session.setActiveMarker(null); // frees the (user_uid, active_marker) slot
        session.setEndedAt(now);

        double ratio = FocusPolicy.computeCompletionRatio(
                session.getAccumulatedStudySeconds(), session.getPlannedDurationSeconds());
        Integer score = FocusPolicy.computeFocusScore(
                session.getFocusedSeconds(),
                session.getDistractedSeconds(),
                session.getNoFaceSeconds(),
                session.getMultipleFaceSeconds(),
                session.getPhoneSeconds(),
                session.getDrowsySeconds());

        session.setCompletionRatio(ratio);
        session.setFocusScore(score);
        session.setSessionClassification(FocusPolicy.classify(finalStatus, ratio, score));
    }

    private long elapsedSeconds(Instant from, Instant to) {
        if (from == null || to == null || to.isBefore(from)) {
            return 0;
        }
        return Duration.between(from, to).getSeconds();
    }
}