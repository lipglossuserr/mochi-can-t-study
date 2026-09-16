package com.mochi.mochibackend.studybuddy.service;

import com.mochi.mochibackend.studybuddy.entity.StudyBuddyEntry;
import com.mochi.mochibackend.studybuddy.enums.StudyBuddyStatus;
import com.mochi.mochibackend.studybuddy.repository.StudyBuddyEntryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * The actual "algorithmic" part of study buddy matching: Jaccard
 * similarity (intersection over union) between the two subjects'
 * lowercased word sets, after dropping a short stopword list of words
 * too generic to mean anything ("study", "exam", "review"...). This is
 * honestly a keyword-overlap heuristic, not semantic matching — "calc
 * 2" and "calculus II" won't find each other, the same way this
 * codebase's focus-detection heuristics are upfront about being
 * shape-from-landmarks rather than true gaze/attention tracking (see
 * useFocusTracker.ts's header comment for that same standard).
 */
@Service
public class StudyBuddyMatchingService {

    /** WAITING entries older than this are treated as gone from the pool — see StudyBuddyService#getStatus for where they actually flip to EXPIRED. */
    static final Duration QUEUE_TTL = Duration.ofMinutes(10);

    /**
     * Below this, two subjects are treated as unrelated rather than a
     * weak match. 0.2 means "at least a fifth of the combined unique
     * words overlap" — low enough that e.g. "calculus" vs "calculus 2"
     * (1 shared word out of 2 unique) clears it at 0.5, but high enough
     * that two single-word, completely different subjects (0 overlap)
     * never do.
     */
    static final double MIN_SIMILARITY = 0.2;

    private static final Set<String> STOPWORDS = Set.of(
            "the", "a", "an", "of", "for", "and", "or", "in", "on", "to", "with",
            "study", "studying", "exam", "test", "quiz", "review", "prep", "preparation",
            "class", "course", "homework", "hw", "final", "midterm"
    );

    private final StudyBuddyEntryRepository repository;

    public StudyBuddyMatchingService(StudyBuddyEntryRepository repository) {
        this.repository = repository;
    }

    /**
     * Looks for the best WAITING candidate for {@code entry} and, if one
     * clears {@link #MIN_SIMILARITY}, marks both entries MATCHED against
     * each other in the same transaction. Relies on
     * {@code findWaitingCandidates}'s pessimistic lock (see that
     * method's own doc comment) to stay correct if two users join at
     * almost the same moment — leaves {@code entry} as WAITING,
     * unmodified, if nothing matches.
     */
    @Transactional
    public StudyBuddyEntry tryMatch(StudyBuddyEntry entry) {
        Instant cutoff = Instant.now().minus(QUEUE_TTL);
        List<StudyBuddyEntry> candidates = repository.findWaitingCandidates(entry.getUserUid(), cutoff);

        StudyBuddyEntry best = null;
        double bestScore = 0;
        for (StudyBuddyEntry candidate : candidates) {
            double score = similarity(entry.getSubject(), candidate.getSubject());
            if (score >= MIN_SIMILARITY && score > bestScore) {
                best = candidate;
                bestScore = score;
            }
        }

        if (best == null) {
            return entry;
        }

        Instant now = Instant.now();
        entry.setStatus(StudyBuddyStatus.MATCHED);
        entry.setMatchedWithUserUid(best.getUserUid());
        entry.setMatchedAt(now);

        best.setStatus(StudyBuddyStatus.MATCHED);
        best.setMatchedWithUserUid(entry.getUserUid());
        best.setMatchedAt(now);
        repository.save(best);

        return entry;
    }

    /** Package-private (not private) so StudyBuddyMatchingServiceTest can exercise the scoring in isolation from the DB/transaction. */
    double similarity(String subjectA, String subjectB) {
        Set<String> tokensA = tokenize(subjectA);
        Set<String> tokensB = tokenize(subjectB);
        if (tokensA.isEmpty() || tokensB.isEmpty()) return 0;

        Set<String> intersection = new HashSet<>(tokensA);
        intersection.retainAll(tokensB);
        if (intersection.isEmpty()) return 0;

        Set<String> union = new HashSet<>(tokensA);
        union.addAll(tokensB);
        return (double) intersection.size() / union.size();
    }

    private Set<String> tokenize(String text) {
        return Arrays.stream(text.toLowerCase().split("[^a-z0-9]+"))
                // A single digit (course number: "2", "3") is kept even
                // at length 1 — it's exactly the kind of token that
                // distinguishes "Calculus 2" from "Calculus 3", and
                // dropping it was a real bug: both subjects would
                // otherwise tokenize down to the identical {"calculus"}
                // and score a perfect, wrong 1.0 match. A single LETTER
                // ("a", "i") is still dropped as noise.
                .filter(token -> (token.length() > 1 || isDigit(token)) && !STOPWORDS.contains(token))
                .collect(Collectors.toSet());
    }

    private boolean isDigit(String token) {
        return token.length() == 1 && Character.isDigit(token.charAt(0));
    }
}
