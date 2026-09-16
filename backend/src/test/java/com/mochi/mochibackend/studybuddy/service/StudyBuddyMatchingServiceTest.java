package com.mochi.mochibackend.studybuddy.service;

import com.mochi.mochibackend.studybuddy.repository.StudyBuddyEntryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Exercises {@code similarity()} in isolation from the DB/transaction —
 * see that method's own doc comment for why it's package-private rather
 * than private. The matching threshold itself (MIN_SIMILARITY) is
 * asserted against directly here too, since a future tweak to either
 * the stopword list or the threshold should have to consciously break
 * one of these cases, not silently change matching behavior.
 */
@ExtendWith(MockitoExtension.class)
class StudyBuddyMatchingServiceTest {

    @Mock
    private StudyBuddyEntryRepository repository;

    // repository is unused by similarity() itself — constructed with a
    // real (mocked) instance anyway so this test doesn't rely on the
    // constructor's null-tolerance, which isn't part of its contract.
    private StudyBuddyMatchingService serviceUnderTest() {
        return new StudyBuddyMatchingService(repository);
    }

    @Test
    void identicalSingleWordSubjects_scoreAsPerfectMatch() {
        double score = serviceUnderTest().similarity("calculus", "calculus");
        assertThat(score).isEqualTo(1.0);
    }

    @Test
    void caseAndPunctuationDontAffectScore() {
        double score = serviceUnderTest().similarity("Calculus II!", "calculus ii");
        assertThat(score).isEqualTo(1.0);
    }

    @Test
    void partialWordOverlap_scoresAboveThreshold() {
        // "calculus" vs "calculus 2": shared {calculus}, union {calculus, 2} -> 1/2 = 0.5
        double score = serviceUnderTest().similarity("calculus", "calculus 2");
        assertThat(score).isEqualTo(0.5);
        assertThat(score).isGreaterThanOrEqualTo(StudyBuddyMatchingService.MIN_SIMILARITY);
    }

    @Test
    void completelyUnrelatedSubjects_scoreZero() {
        double score = serviceUnderTest().similarity("calculus", "chemistry");
        assertThat(score).isEqualTo(0.0);
        assertThat(score).isLessThan(StudyBuddyMatchingService.MIN_SIMILARITY);
    }

    @Test
    void stopwordsAreIgnoredOnBothSides() {
        // "organic chemistry" vs "chemistry review": "review" is a stopword,
        // so the real comparison is {organic, chemistry} vs {chemistry} -> 1/2 = 0.5
        double score = serviceUnderTest().similarity("organic chemistry", "chemistry review");
        assertThat(score).isEqualTo(0.5);
    }

    @Test
    void subjectThatIsOnlyStopwords_neverMatchesAnything() {
        // "study for the exam" tokenizes to nothing meaningful once
        // stopwords are stripped — should never produce a false-positive
        // match regardless of what it's compared against.
        double score = serviceUnderTest().similarity("study for the exam", "calculus");
        assertThat(score).isEqualTo(0.0);
    }

    @Test
    void singleLetterTokensAreIgnored() {
        // Single-character tokens are filtered UNLESS they're a digit
        // (see tokenize's isDigit carve-out) — a stray single letter
        // shouldn't count as a meaningful shared word, unlike a course
        // number such as "2".
        double score = serviceUnderTest().similarity("a calculus", "a chemistry");
        assertThat(score).isEqualTo(0.0);
    }

    @Test
    void differentCourseNumbers_areNotTreatedAsIdenticalSubjects() {
        // Regression test for a real bug: the token filter used to drop
        // ALL single-character tokens, including single-digit course
        // numbers — meaning "Calculus 2" and "Calculus 3" both
        // tokenized down to the identical {"calculus"} and scored a
        // perfect, wrong 1.0 match. Digits are now kept at length 1
        // specifically so two different numbered courses read as
        // related-but-distinct, not identical.
        double score = serviceUnderTest().similarity("Calculus 2", "Calculus 3");
        assertThat(score).isLessThan(1.0);
    }
}
