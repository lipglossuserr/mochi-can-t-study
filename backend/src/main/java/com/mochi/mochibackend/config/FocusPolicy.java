package com.mochi.mochibackend.config;

import com.mochi.mochibackend.model.SessionClassification;
import com.mochi.mochibackend.model.SessionStatus;

/**
 * Single home for every focus/classification threshold, so numbers are
 * never scattered through service code. Values are the MVP defaults from
 * the project requirements.
 */
public final class FocusPolicy {

    private FocusPolicy() {
    }

    /** Minimum selectable study duration: exactly 5 minutes. */
    public static final int MIN_DURATION_SECONDS = 300;

    /** VALID requires at least 90% of planned time completed. */
    public static final double VALID_COMPLETION_RATIO = 0.90;

    /** VALID requires a focus score of at least 70. */
    public static final int VALID_FOCUS_SCORE = 70;

    /** PARTIAL requires at least 50% of planned time completed. */
    public static final double PARTIAL_COMPLETION_RATIO = 0.50;

    /** PARTIAL requires a focus score of at least 40. */
    public static final int PARTIAL_FOCUS_SCORE = 40;

    /** Clock-skew tolerance when validating focus batch windows. */
    public static final long BATCH_CLOCK_TOLERANCE_MILLIS = 2_000;

    /**
     * focusScore = focused / (focused + distracted + noFace + multipleFace
     * + phone + drowsy) * 100. Camera-unavailable time is not usable
     * monitored time. Phone (hand detected near the face, sustained) and
     * drowsy (eyes closed, sustained) are both counted as monitored-but-
     * not-focused — the same treatment as distracted — since both are,
     * definitionally, moments the camera confirms someone was present
     * but not actually studying.
     *
     * @return score 0-100, or null when there is no usable monitored time
     *         (division-by-zero handled by returning null).
     */
    public static Integer computeFocusScore(long focusedSeconds,
                                            long distractedSeconds,
                                            long noFaceSeconds,
                                            long multipleFaceSeconds,
                                            long phoneSeconds,
                                            long drowsySeconds) {
        long usable = focusedSeconds + distractedSeconds + noFaceSeconds + multipleFaceSeconds
                + phoneSeconds + drowsySeconds;
        if (usable <= 0) {
            return null;
        }
        long score = Math.round(focusedSeconds * 100.0 / usable);
        return (int) Math.max(0, Math.min(100, score));
    }

    /** completionRatio = actual / planned, clamped to [0, 1]. */
    public static double computeCompletionRatio(long actualStudySeconds, int plannedDurationSeconds) {
        if (plannedDurationSeconds <= 0) {
            return 0.0;
        }
        double ratio = (double) actualStudySeconds / plannedDurationSeconds;
        return Math.max(0.0, Math.min(1.0, ratio));
    }

    /**
     * Applies the VALID / PARTIAL / INVALID rules. A null focus score
     * (no usable focus data) can never be VALID or PARTIAL.
     */
    public static SessionClassification classify(SessionStatus finalStatus,
                                                 double completionRatio,
                                                 Integer focusScore) {
        if (focusScore != null
                && finalStatus == SessionStatus.COMPLETED
                && completionRatio >= VALID_COMPLETION_RATIO
                && focusScore >= VALID_FOCUS_SCORE) {
            return SessionClassification.VALID;
        }
        if (focusScore != null
                && completionRatio >= PARTIAL_COMPLETION_RATIO
                && focusScore >= PARTIAL_FOCUS_SCORE) {
            return SessionClassification.PARTIAL;
        }
        return SessionClassification.INVALID;
    }
}
