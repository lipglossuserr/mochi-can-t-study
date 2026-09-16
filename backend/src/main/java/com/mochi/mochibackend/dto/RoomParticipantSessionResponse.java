package com.mochi.mochibackend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One participant's session within a co-study room — Study Rooms
 * Phase 2. {@code userUid} is exposed here (unlike most responses)
 * because the room's own participant list already shows the same uids
 * to every room member via Firestore; this endpoint isn't leaking
 * anything the client didn't already know.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RoomParticipantSessionResponse {

    private String userUid;
    private String status;
    private long accumulatedStudySeconds;
    private Integer focusScore;
    private String sessionClassification;
}
