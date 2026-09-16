package com.mochi.mochibackend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Request payload for {@code POST /api/study-sessions/start}.
 * <p>
 * Bean Validation enforces the 5-minute minimum here, and the service
 * layer enforces it again in seconds — the backend never relies on
 * frontend validation alone.
 */
@Getter
@Setter
public class StartSessionRequest {

    @NotNull(message = "Planned duration is required")
    @Min(value = 5, message = "Study sessions must be at least 5 minutes")
    private Integer plannedDurationMinutes;

    /**
     * Optional. References a Task id. As of Sprint 7.2B, the service layer
     * validates that this task exists and belongs to the caller (same
     * ownership check {@code TaskService} already applies) before the
     * session is created — an unknown or another user's task id is
     * rejected the same way an unknown/foreign task id is elsewhere.
     */
    private Long taskId;

    /**
     * Optional. The Firestore co-study room id (rooms/{roomId}) this
     * session was started from — Study Rooms Phase 2. Not validated
     * against Firestore here (unlike taskId against MySQL): the room
     * doc's own security rules already gate who can be in it, and a
     * stale/bogus id here only affects room-summary aggregation, never
     * ownership or rewards, so it's stored as given.
     */
    @Size(max = 64, message = "roomId is too long")
    private String roomId;
}
