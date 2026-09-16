package com.mochi.mochibackend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * Personal (current-user-only) rollup over every {@code StudySession}
 * ever linked to a co-study room — Study Rooms Phase 5 (roadmap §6's
 * "success metrics"), scoped down from a global/admin dashboard since
 * this codebase has no admin-role concept to gate one behind. Every
 * number here is computed from MySQL's own durable session history,
 * not from Firestore — Firestore's participant docs are deleted on
 * leave and its messages aren't queryable across many rooms in one
 * call, so metrics that would need those (camera-on ratio,
 * chat-to-focus-minute ratio — both named in roadmap §6) aren't in
 * this response. See {@code changes.md} for why that's a deliberate,
 * documented gap rather than an oversight.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RoomAnalyticsResponse {

    private int totalRoomSessions;
    private long totalRoomStudySeconds;
    private int distinctRoomsJoined;
    private double averageSessionMinutes;
    /** Distinct calendar dates (UTC) with at least one room session — a coarse "did they come back" proxy for roadmap §6's return-rate metric. */
    private int distinctActiveDays;
    /** Last 30 days, oldest first, one entry per day with at least one session — for a simple trend sparkline, not a full calendar grid. */
    private List<DailyRoomMinutes> recentDailyMinutes;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyRoomMinutes {
        /** ISO-8601 date (yyyy-MM-dd), UTC. */
        private String date;
        private long minutes;
    }
}
