package com.mochi.mochibackend.config;

import com.mochi.mochibackend.model.SessionClassification;
import com.mochi.mochibackend.model.SessionStatus;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class FocusPolicyTest {

    @Test
    void focusScoreIsFocusedOverUsableTime() {
        // 90 focused / 100 usable = 90
        assertThat(FocusPolicy.computeFocusScore(90, 5, 5, 0, 0, 0)).isEqualTo(90);
    }

    @Test
    void zeroUsableTimeYieldsNullScoreInsteadOfDivisionByZero() {
        assertThat(FocusPolicy.computeFocusScore(0, 0, 0, 0, 0, 0)).isNull();
    }

    @Test
    void phoneTimeCountsAsUsableButNotFocused() {
        // 50 focused / (50 focused + 50 phone) = 50 — phone pulls the
        // score down exactly like distracted would, not like
        // camera-unavailable (which isn't usable time at all).
        assertThat(FocusPolicy.computeFocusScore(50, 0, 0, 0, 50, 0)).isEqualTo(50);
    }

    @Test
    void drowsyTimeCountsAsUsableButNotFocused() {
        assertThat(FocusPolicy.computeFocusScore(50, 0, 0, 0, 0, 50)).isEqualTo(50);
    }

    @Test
    void completionRatioIsClampedToOne() {
        assertThat(FocusPolicy.computeCompletionRatio(400, 300)).isEqualTo(1.0);
    }

    @Test
    void classifiesValidSession() {
        assertThat(FocusPolicy.classify(SessionStatus.COMPLETED, 0.95, 80))
                .isEqualTo(SessionClassification.VALID);
    }

    @Test
    void classifiesPartialSession() {
        assertThat(FocusPolicy.classify(SessionStatus.STOPPED, 0.60, 55))
                .isEqualTo(SessionClassification.PARTIAL);
    }

    @Test
    void classifiesInvalidWhenCompletionTooLow() {
        assertThat(FocusPolicy.classify(SessionStatus.STOPPED, 0.30, 90))
                .isEqualTo(SessionClassification.INVALID);
    }

    @Test
    void classifiesInvalidWhenFocusScoreTooLow() {
        assertThat(FocusPolicy.classify(SessionStatus.COMPLETED, 1.0, 20))
                .isEqualTo(SessionClassification.INVALID);
    }

    @Test
    void classifiesInvalidWhenFocusDataUnusable() {
        assertThat(FocusPolicy.classify(SessionStatus.COMPLETED, 1.0, null))
                .isEqualTo(SessionClassification.INVALID);
    }

    @Test
    void stoppedSessionCannotBeValidEvenWithPerfectNumbers() {
        assertThat(FocusPolicy.classify(SessionStatus.STOPPED, 1.0, 100))
                .isEqualTo(SessionClassification.PARTIAL);
    }
}
