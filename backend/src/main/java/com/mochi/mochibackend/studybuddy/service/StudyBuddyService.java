package com.mochi.mochibackend.studybuddy.service;

import com.mochi.mochibackend.exception.StudyBuddyEntryNotFoundException;
import com.mochi.mochibackend.studybuddy.entity.StudyBuddyEntry;
import com.mochi.mochibackend.studybuddy.enums.StudyBuddyStatus;
import com.mochi.mochibackend.studybuddy.repository.StudyBuddyEntryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class StudyBuddyService {

    private static final List<StudyBuddyStatus> ACTIVE_STATUSES =
            List.of(StudyBuddyStatus.WAITING, StudyBuddyStatus.MATCHED);

    private final StudyBuddyEntryRepository repository;
    private final StudyBuddyMatchingService matchingService;

    public StudyBuddyService(StudyBuddyEntryRepository repository, StudyBuddyMatchingService matchingService) {
        this.repository = repository;
        this.matchingService = matchingService;
    }

    /**
     * Joins the queue, or — if the caller already has an active entry —
     * just returns that one unchanged rather than creating a second row.
     * Idempotent on purpose: a client re-POSTing on reconnect/retry
     * shouldn't spawn a duplicate queue slot for the same person.
     */
    @Transactional
    public StudyBuddyEntry joinQueue(String userUid, String subject) {
        Optional<StudyBuddyEntry> existing = findActive(userUid);
        if (existing.isPresent()) {
            return existing.get();
        }

        StudyBuddyEntry entry = new StudyBuddyEntry();
        entry.setUserUid(userUid);
        entry.setSubject(subject.trim());
        entry = repository.save(entry); // needs an id assigned before the matching lock/compare below

        return matchingService.tryMatch(entry);
    }

    /** Voluntary leave — only meaningful while still WAITING; leaving after a MATCHED entry has a real room isn't handled here (see the frontend's own "leave room" flow instead). */
    @Transactional
    public void leaveQueue(String userUid) {
        repository.findFirstByUserUidAndStatusInOrderByCreatedAtDesc(userUid, List.of(StudyBuddyStatus.WAITING))
                .ifPresent(entry -> {
                    entry.setStatus(StudyBuddyStatus.CANCELLED);
                    repository.save(entry);
                });
    }

    /**
     * Lazily expires a stale WAITING entry on read rather than needing a
     * scheduled sweep — see StudyBuddyMatchingService.QUEUE_TTL. Cheap
     * to do here since every status poll already fetches this row.
     */
    @Transactional
    public StudyBuddyEntry getStatus(String userUid) {
        StudyBuddyEntry entry = findActive(userUid)
                .orElseThrow(() -> new StudyBuddyEntryNotFoundException("Not currently in the study buddy queue"));

        if (entry.getStatus() == StudyBuddyStatus.WAITING
                && entry.getCreatedAt().isBefore(Instant.now().minus(StudyBuddyMatchingService.QUEUE_TTL))) {
            entry.setStatus(StudyBuddyStatus.EXPIRED);
            return repository.save(entry);
        }

        return entry;
    }

    /**
     * Hand-off after a match: whichever matched user's client creates
     * the Firestore room first reports its id here, so the other side's
     * next {@code getStatus} poll picks it up. Silently a no-op if the
     * caller has no MATCHED entry (e.g. a stale/duplicate report after
     * the room was already set, or a race with the other side reporting
     * first) — reporting a room id is inherently best-effort information
     * sharing, not a state transition worth failing loudly over.
     */
    @Transactional
    public void reportRoom(String userUid, String roomId) {
        repository.findFirstByUserUidAndStatusInOrderByCreatedAtDesc(userUid, List.of(StudyBuddyStatus.MATCHED))
                .ifPresent(entry -> {
                    entry.setRoomId(roomId);
                    repository.save(entry);
                    // Also stamp the matched partner's row, so THEIR poll
                    // sees the room id too without needing their own report
                    // call — only one side ever actually creates the room.
                    repository
                            .findFirstByUserUidAndStatusInOrderByCreatedAtDesc(
                                    entry.getMatchedWithUserUid(), List.of(StudyBuddyStatus.MATCHED))
                            .ifPresent(partner -> {
                                partner.setRoomId(roomId);
                                repository.save(partner);
                            });
                });
    }

    private Optional<StudyBuddyEntry> findActive(String userUid) {
        return repository.findFirstByUserUidAndStatusInOrderByCreatedAtDesc(userUid, ACTIVE_STATUSES);
    }
}
