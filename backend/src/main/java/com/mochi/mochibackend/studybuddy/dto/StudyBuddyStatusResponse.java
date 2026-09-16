package com.mochi.mochibackend.studybuddy.dto;

import com.mochi.mochibackend.studybuddy.enums.StudyBuddyStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Polled by the client (see the frontend's useStudyBuddyQueue) while
 * WAITING, and once more after MATCHED to pick up {@code roomId} once
 * either side's client reports it. {@code matchedWithUserUid} is
 * intentionally the only identifying detail here — the frontend
 * resolves a friendly display (pet name/skin) for it via the existing
 * public-pet batch lookup (`PublicPetSummaryResponse`) rather than this
 * endpoint duplicating that.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StudyBuddyStatusResponse {

    private StudyBuddyStatus status;
    private String subject;
    private String matchedWithUserUid;
    private String roomId;
}
