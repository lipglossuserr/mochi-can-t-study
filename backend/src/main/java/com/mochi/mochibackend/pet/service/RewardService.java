package com.mochi.mochibackend.pet.service;

import com.mochi.mochibackend.pet.config.RewardPolicy;
import com.mochi.mochibackend.pet.entity.Pet;
import com.mochi.mochibackend.pet.enums.PetState;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;

/**
 * Owns every gameplay reward rule. {@code PetService} only ever knows
 * how to fetch and persist a pet and how feed/play work — it has no idea
 * study sessions exist. This service is the one place that turns "a
 * study session happened" into XP, coins, mood, bond, and level/stage
 * progression, then hands the mutated pet back to {@code PetService} for
 * persistence.
 * <p>
 * Flow for a completed study session:
 * <pre>
 *   Study Session Completed
 *     -&gt; calculate XP
 *     -&gt; calculate coins
 *     -&gt; increase mood (clamped)
 *     -&gt; increase bond (clamped)
 *     -&gt; check level
 *     -&gt; check stage
 *     -&gt; update streak
 *     -&gt; set state = CELEBRATING
 *     -&gt; save pet
 * </pre>
 * <p>
 * Duplicate-reward safety: this method itself has no notion of "have I
 * already rewarded this session" — that guarantee comes from the caller.
 * {@code StudySessionService.complete} is idempotent and only reaches
 * the call site on the one transition into {@code COMPLETED}; a repeated
 * completion request short-circuits before ever invoking this service,
 * so a session can never be rewarded twice.
 */
@Service
public class RewardService {

    private final PetService petService;
    private final Clock clock;

    public RewardService(PetService petService, Clock clock) {
        this.petService = petService;
        this.clock = clock;
    }

    /**
     * Applies the full reward pipeline for one successfully completed
     * study session and persists the result.
     *
     * @param userId        the Firebase uid whose pet should be rewarded
     * @param studiedSeconds the session's final studied time (already
     *                       server-computed and clamped to the planned
     *                       duration by {@code StudySessionService})
     * @param isRoomSession whether this session was linked to a
     *                      co-study room (StudySession.roomId != null)
     *                      — applies {@link RewardPolicy#ROOM_SESSION_BONUS_MULTIPLIER}
     *                      to XP/coins when true, same studied time
     *                      otherwise rewarded identically to a solo
     *                      session.
     * @return the updated, persisted pet
     */
    @Transactional
    public Pet applyStudySessionCompletionReward(String userId, long studiedSeconds, boolean isRoomSession) {
        Pet pet = petService.getPet(userId);

        int durationMinutes = (int) (studiedSeconds / 60);
        double multiplier = isRoomSession ? RewardPolicy.ROOM_SESSION_BONUS_MULTIPLIER : 1.0;

        int xpGained = (int) Math.round(durationMinutes * RewardPolicy.XP_PER_MINUTE * multiplier);
        int coinsGained = (int) Math.round(durationMinutes * RewardPolicy.COINS_PER_MINUTE * multiplier);

        pet.setXp(pet.getXp() + xpGained);
        pet.setCoins(pet.getCoins() + coinsGained);
        pet.setMood(clamp(pet.getMood() + RewardPolicy.MOOD_REWARD));
        pet.setBond(clamp(pet.getBond() + RewardPolicy.BOND_REWARD));

        int newLevel = LevelCalculator.calculateLevel(pet.getXp());
        pet.setLevel(newLevel);
        pet.setStage(LevelCalculator.calculateStage(newLevel));

        updateStreak(pet);

        pet.setState(PetState.CELEBRATING);

        return petService.save(pet);
    }

    /**
     * Applies the reward for one completed task and persists the
     * result. The caller (TaskService) has already resolved the task's
     * priority into a concrete xpGained/coinsGained before calling
     * here — the same division of labor as
     * applyStudySessionCompletionReward, which receives an
     * already-computed studiedSeconds rather than a StudySession
     * itself: this service applies numbers, it doesn't own domain
     * policy about where they came from.
     * <p>
     * No bond increase here, unlike a study session — bond represents
     * time spent together, which a task checkbox doesn't represent.
     * Mood still rises (a flat, priority-independent nudge): finishing
     * something is still a small win for Mochi either way. No streak
     * update here either — the streak tracks study days, not tasks.
     */
    @Transactional
    public Pet applyTaskCompletionReward(String userId, int xpGained, int coinsGained) {
        Pet pet = petService.getPet(userId);

        pet.setXp(pet.getXp() + xpGained);
        pet.setCoins(pet.getCoins() + coinsGained);
        pet.setMood(clamp(pet.getMood() + RewardPolicy.TASK_MOOD_REWARD));

        int newLevel = LevelCalculator.calculateLevel(pet.getXp());
        pet.setLevel(newLevel);
        pet.setStage(LevelCalculator.calculateStage(newLevel));

        pet.setState(PetState.CELEBRATING);

        return petService.save(pet);
    }

    /**
     * Applies the reward for one completed flashcard deck. Same
     * division of labor as applyTaskCompletionReward: the caller
     * (FlashcardDeckService) has already confirmed this is the one
     * real transition into completed=true before calling here, so a
     * repeated "Complete Deck" tap can never double-grant XP/coins.
     */
    @Transactional
    public Pet applyFlashcardDeckCompletionReward(String userId, int cardCount) {
        Pet pet = petService.getPet(userId);

        int xpGained = cardCount * RewardPolicy.FLASHCARD_XP_PER_CARD;
        int coinsGained = Math.max(RewardPolicy.FLASHCARD_MIN_COINS, cardCount / RewardPolicy.FLASHCARD_COINS_DIVISOR);

        pet.setXp(pet.getXp() + xpGained);
        pet.setCoins(pet.getCoins() + coinsGained);
        pet.setMood(clamp(pet.getMood() + RewardPolicy.FLASHCARD_MOOD_REWARD));

        int newLevel = LevelCalculator.calculateLevel(pet.getXp());
        pet.setLevel(newLevel);
        pet.setStage(LevelCalculator.calculateStage(newLevel));

        pet.setState(PetState.CELEBRATING);

        return petService.save(pet);
    }

    private int clamp(int value) {
        return Math.max(RewardPolicy.MIN_STAT, Math.min(RewardPolicy.MAX_STAT, value));
    }

    /**
     * Advances the pet's daily study streak based on today's date vs.
     * {@code lastStudyDate}. Same-day repeat completions are a no-op
     * (streak already counted today); exactly one day after the last
     * study date continues it; any bigger gap (or no prior date at all)
     * resets it to 1. {@code longestStreak} is a high-water mark that
     * only ever grows.
     */
    private void updateStreak(Pet pet) {
        LocalDate today = LocalDate.now(clock);
        LocalDate lastStudyDate = pet.getLastStudyDate();

        if (today.equals(lastStudyDate)) {
            return;
        }

        if (lastStudyDate != null && lastStudyDate.plusDays(1).equals(today)) {
            pet.setCurrentStreak(pet.getCurrentStreak() + 1);
        } else {
            pet.setCurrentStreak(1);
        }

        pet.setLongestStreak(Math.max(pet.getLongestStreak(), pet.getCurrentStreak()));
        pet.setLastStudyDate(today);
    }
}
