package com.mochi.mochibackend.studybuddy.enums;

/**
 * Lifecycle of a {@code StudyBuddyEntry}. Deliberately no PENDING/
 * CONFIRMING step between WAITING and MATCHED — matching is immediate
 * and mutual (see {@code StudyBuddyMatchingService}), so there's no
 * "accept/decline" window either side needs to sit through.
 */
public enum StudyBuddyStatus {
    /** In the queue, waiting for a compatible subject to show up. */
    WAITING,
    /** Paired with another WAITING entry — see {@code matchedWithUserId}/{@code roomId} on the entity. */
    MATCHED,
    /** The user left the queue voluntarily before being matched. */
    CANCELLED,
    /**
     * Aged out unmatched (see {@code StudyBuddyMatchingService#QUEUE_TTL}).
     * Not deleted — kept for the same reason other status history in
     * this codebase isn't hard-deleted, e.g. {@code ReportService}'s
     * queue: an honest, inspectable record of what happened, however
     * uneventfully.
     */
    EXPIRED
}
