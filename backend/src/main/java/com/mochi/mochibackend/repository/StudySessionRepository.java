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
}
