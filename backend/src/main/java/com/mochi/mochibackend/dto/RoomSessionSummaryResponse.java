package com.mochi.mochibackend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * Aggregated view of every backend {@code StudySession} that was
 * started with a given co-study room id — Study Rooms Phase 2 (GET
 * {@code /api/study-sessions/room/{roomId}/summary}). This is a
 * read-only rollup over MySQL rows; it says nothing about who's
 * currently *present* in the room (that's Firestore's job, via
 * {@code subscribeToParticipants}) — only who has ever linked a real
 * study session to it. A participant who never started their timer
 * (e.g. joined but left before the host started it) simply has no row
 * here.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RoomSessionSummaryResponse {

    private String roomId;
    private int participantCount;
    private long totalAccumulatedStudySeconds;
    /** Average of non-null focusScore values across linked sessions; null if none have one yet. */
    private Double averageFocusScore;
    private List<RoomParticipantSessionResponse> participants;
}
