package com.mochi.mochibackend.repository;

import com.mochi.mochibackend.model.SessionStatus;
import com.mochi.mochibackend.model.StudySession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface StudySessionRepository extends JpaRepository<StudySession, Long> {

    /** Ownership-safe lookup: another user's session id behaves as "not found". */
    Optional<StudySession> findByIdAndUserUid(Long id, String userUid);

    /** The user's single RUNNING or PAUSED session, if any. */
    Optional<StudySession> findFirstByUserUidAndStatusIn(String userUid, Collection<SessionStatus> statuses);

    List<StudySession> findAllByUserUidOrderByCreatedAtDesc(String userUid);

    /** Used by AchievementService — total completed sessions is one of its criteria inputs. */
    long countByUserUidAndStatus(String userUid, SessionStatus status);

    /** Every session (any status, any user) started from a given co-study room — Study Rooms Phase 2 summary. */
    List<StudySession> findAllByRoomIdOrderByCreatedAtAsc(String roomId);

    /** A single user's own room-linked session history, newest first — Study Rooms Phase 5 personal analytics. */
    List<StudySession> findAllByUserUidAndRoomIdIsNotNullOrderByCreatedAtDesc(String userUid);

    /**
     * Every still-active (RUNNING/PAUSED) session in a room — Study
     * Rooms "all must finish" policy. Used to bulk-stop every
     * participant's session at once when that policy is violated, so
     * no one who was still connected keeps studying toward a reward
     * the room has already decided is void.
     */
    List<StudySession> findAllByRoomIdAndStatusIn(String roomId, Collection<SessionStatus> statuses);
}
