package com.mochi.mochibackend.config;

import com.mochi.mochibackend.model.SessionClassification;
import com.mochi.mochibackend.model.SessionStatus;

public final class FocusPolicy {

    private FocusPolicy() {
    }

    public static final int MIN_DURATION_SECONDS = 300;

    public static final double VALID_COMPLETION_RATIO = 0.90;

    public static final int VALID_FOCUS_SCORE = 70;

    public static final double PARTIAL_COMPLETION_RATIO = 0.50;

    public static final int PARTIAL_FOCUS_SCORE = 40;

    public static final long BATCH_CLOCK_TOLERANCE_MILLIS = 2_000;


    /**
     * Focus score calculation:
     *
     * focused /
     * (focused + distracted + noFace + multipleFace + phone + drowsy)
     *
     * PHONE and DROWSY are counted as non-focused states.
     */
    public static Integer computeFocusScore(
            long focusedSeconds,
            long distractedSeconds,
            long noFaceSeconds,
            long multipleFaceSeconds,
            long phoneSeconds,
            long drowsySeconds
    ) {

        long usable =
                focusedSeconds
                        + distractedSeconds
                        + noFaceSeconds
                        + multipleFaceSeconds
                        + phoneSeconds
                        + drowsySeconds;


        if (usable <= 0) {
            return null;
        }


        long score = Math.round(
                focusedSeconds * 100.0 / usable
        );


        return (int) Math.max(
                0,
                Math.min(100, score)
        );
    }


    public static double computeCompletionRatio(
            long actualStudySeconds,
            int plannedDurationSeconds
    ) {

        if (plannedDurationSeconds <= 0) {
            return 0.0;
        }


        double ratio =
                (double) actualStudySeconds /
                        plannedDurationSeconds;


        return Math.max(
                0.0,
                Math.min(1.0, ratio)
        );
    }


    public static SessionClassification classify(
            SessionStatus finalStatus,
            double completionRatio,
            Integer focusScore
    ) {

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