package com.mochi.mochibackend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * One reported focus-tracking window (~15s), reshaped for charting —
 * the session focus timeline graph. Same underlying data as
 * {@code FocusBatch}, just as a plain response shape and with a
 * pre-computed 0-100 focus score for the window so the frontend never
 * needs to reimplement that math.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FocusTimelinePointResponse {

    private Instant windowStartedAt;
    private Instant windowEndedAt;

    private long focusedMilliseconds;
    private long distractedMilliseconds;
    private long noFaceMilliseconds;
    private long multipleFaceMilliseconds;
    private long cameraUnavailableMilliseconds;
    private long phoneMilliseconds;
    private long drowsyMilliseconds;

    /**
     * 0-100: focusedMilliseconds as a share of every monitored
     * millisecond in the window (camera-unavailable time excluded from
     * the denominator entirely — there's nothing to be "focused" or
     * "distracted" relative to if the camera wasn't even reporting).
     * Windows where nothing was monitored (all zero, e.g. a gap) report
     * null rather than a misleading 0.
     */
    private Double focusScore;
}
