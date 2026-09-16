package com.mochi.mochibackend.studybuddy.entity;

import com.mochi.mochibackend.studybuddy.enums.StudyBuddyStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * One user's attempt to find a study buddy — free-text {@code subject}
 * ("Calculus II", "orgo exam prep") they typed when joining the queue,
 * matched against other users' {@code WAITING} entries by keyword
 * overlap (see {@code StudyBuddyMatchingService}). This is honestly a
 * simple heuristic, not semantic understanding — "Calculus II" and
 * "calc 2 review" won't match each other; same epistemic-honesty
 * standard the focus-tracking heuristics hold themselves to elsewhere
 * in this codebase.
 * <p>
 * At most one non-terminal ({@code WAITING} or {@code MATCHED}) row
 * per user at a time — enforced in {@code StudyBuddyService}, not by a
 * DB constraint, since a user's old {@code CANCELLED}/{@code EXPIRED}
 * rows should stay queryable as history rather than being deleted or
 * blocked by a unique index that would need cleanup logic of its own.
 * <p>
 * Rooms themselves live in Firestore, not here (see
 * {@code CoStudyRoomRepository}'s own doc comment on why Study Rooms'
 * realtime state is Firestore-owned) — {@code roomId} is just a
 * hand-off value. Whichever matched user's client creates the Firestore
 * room first calls {@code POST /api/study-buddy/queue/room} to report
 * its id back, so the other user's next poll picks it up and joins
 * instead of also creating one.
 */
@Entity
@Table(
        name = "study_buddy_entries",
        indexes = {
                @Index(name = "idx_study_buddy_user_status", columnList = "user_uid, status"),
                @Index(name = "idx_study_buddy_status_created", columnList = "status, created_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class StudyBuddyEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_uid", nullable = false, length = 128)
    private String userUid;

    @Column(name = "subject", nullable = false, length = 200)
    private String subject;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private StudyBuddyStatus status = StudyBuddyStatus.WAITING;

    /** Set only once {@code status == MATCHED}. The other half of a mutual pair — that row's own {@code matchedWithUserId} points back here. */
    @Column(name = "matched_with_user_uid", length = 128)
    private String matchedWithUserUid;

    /** Firestore co-study room id, filled in after a match via the room hand-off endpoint (see class doc). Null until then even for a MATCHED entry. */
    @Column(name = "room_id", length = 128)
    private String roomId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "matched_at")
    private Instant matchedAt;

    /** Optimistic locking guard — matching writes two rows in one transaction (see StudyBuddyMatchingService), so a concurrent read racing that write should fail cleanly rather than serve a half-updated pair. */
    @Version
    @Column(name = "version", nullable = false)
    private Long version;
}
