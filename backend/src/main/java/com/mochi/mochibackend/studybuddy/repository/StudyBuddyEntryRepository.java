package com.mochi.mochibackend.studybuddy.repository;

import com.mochi.mochibackend.studybuddy.entity.StudyBuddyEntry;
import com.mochi.mochibackend.studybuddy.enums.StudyBuddyStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface StudyBuddyEntryRepository extends JpaRepository<StudyBuddyEntry, Long> {

    /** A user has at most one non-terminal entry at a time — see StudyBuddyEntry's class doc. */
    Optional<StudyBuddyEntry> findFirstByUserUidAndStatusInOrderByCreatedAtDesc(
            String userUid, List<StudyBuddyStatus> statuses);

    /**
     * Everyone else currently WAITING and not yet aged out, oldest
     * first (a fair queue — the person who's been waiting longest gets
     * matched first among equally-good candidates, since the caller
     * picks the highest-scoring match and ties are broken by this
     * ordering). PESSIMISTIC_WRITE so two users joining at the exact
     * same moment can't both read the same lone candidate and both try
     * to match against them — the second transaction blocks until the
     * first commits (marking that row MATCHED), then re-reads and
     * correctly sees it's no longer WAITING. This is a real lock, not a
     * best-effort one, appropriate for this table's realistic write
     * volume (a join/match happens on human timescales — seconds
     * apart — never a hot loop).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM StudyBuddyEntry e "
            + "WHERE e.status = com.mochi.mochibackend.studybuddy.enums.StudyBuddyStatus.WAITING "
            + "AND e.userUid <> :excludeUserUid "
            + "AND e.createdAt > :cutoff "
            + "ORDER BY e.createdAt ASC")
    List<StudyBuddyEntry> findWaitingCandidates(
            @Param("excludeUserUid") String excludeUserUid, @Param("cutoff") Instant cutoff);
}
