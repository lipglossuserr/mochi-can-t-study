package com.mochi.mochibackend.pet.service;

import com.mochi.mochibackend.pet.entity.Pet;
import com.mochi.mochibackend.pet.enums.PetSpecies;
import com.mochi.mochibackend.pet.enums.PetStage;
import com.mochi.mochibackend.pet.enums.PetState;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RewardServiceTest {

    private static final String UID = "user-abc";

    /** Fixed at 2026-01-15T12:00:00Z so streak-by-date tests are deterministic. */
    private static final Clock FIXED_CLOCK =
            Clock.fixed(Instant.parse("2026-01-15T12:00:00Z"), ZoneOffset.UTC);

    @Mock
    private PetService petService;

    private RewardService rewardService;

    @BeforeEach
    void setUp() {
        rewardService = new RewardService(petService, FIXED_CLOCK);

        when(petService.save(any(Pet.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    // ---------- XP ----------

    @Test
    void grantsTwoXpPerStudiedMinute() {
        Pet pet = starterPet();
        when(petService.getPet(UID)).thenReturn(pet);

        Pet result = rewardService.applyStudySessionCompletionReward(UID, 25 * 60L, false);

        assertThat(result.getXp()).isEqualTo(50); // 25 min * 2
    }

    @Test
    void roomLinkedSessionGrantsOnePointFiveTimesXpAndCoins() {
        Pet pet = starterPet();
        when(petService.getPet(UID)).thenReturn(pet);

        Pet result = rewardService.applyStudySessionCompletionReward(UID, 20 * 60L, true);

        // 20 min * 2 xp/min * 1.5 = 60, 20 min * 1 coin/min * 1.5 = 30
        assertThat(result.getXp()).isEqualTo(60);
        assertThat(result.getCoins()).isEqualTo(30);
    }

    @Test
    void fiftyMinutesGrantsOneHundredXp() {
        Pet pet = starterPet();
        when(petService.getPet(UID)).thenReturn(pet);

        Pet result = rewardService.applyStudySessionCompletionReward(UID, 50 * 60L, false);

        assertThat(result.getXp()).isEqualTo(100);
    }

    @Test
    void xpAccumulatesOnTopOfExistingXp() {
        Pet pet = starterPet();
        pet.setXp(40);
        when(petService.getPet(UID)).thenReturn(pet);

        Pet result = rewardService.applyStudySessionCompletionReward(UID, 25 * 60L, false);

        assertThat(result.getXp()).isEqualTo(90); // 40 + 50
    }

    // ---------- Coins ----------

    @Test
    void grantsOneCoinPerStudiedMinute() {
        Pet pet = starterPet();
        when(petService.getPet(UID)).thenReturn(pet);

        Pet result = rewardService.applyStudySessionCompletionReward(UID, 25 * 60L, false);

        assertThat(result.getCoins()).isEqualTo(25);
    }

    @Test
    void coinsAccumulateOnTopOfExistingCoins() {
        Pet pet = starterPet();
        pet.setCoins(10);
        when(petService.getPet(UID)).thenReturn(pet);

        Pet result = rewardService.applyStudySessionCompletionReward(UID, 25 * 60L, false);

        assertThat(result.getCoins()).isEqualTo(35);
    }

    // ---------- Mood / bond, including clamping ----------

    @Test
    void increasesMoodByFiveAndBondByThree() {
        Pet pet = starterPet();
        pet.setMood(50);
        pet.setBond(50);
        when(petService.getPet(UID)).thenReturn(pet);

        Pet result = rewardService.applyStudySessionCompletionReward(UID, 25 * 60L, false);

        assertThat(result.getMood()).isEqualTo(55);
        assertThat(result.getBond()).isEqualTo(53);
    }

    @Test
    void moodClampsAtOneHundred() {
        Pet pet = starterPet();
        pet.setMood(98);
        when(petService.getPet(UID)).thenReturn(pet);

        Pet result = rewardService.applyStudySessionCompletionReward(UID, 25 * 60L, false);

        assertThat(result.getMood()).isEqualTo(100);
    }

    @Test
    void bondClampsAtOneHundred() {
        Pet pet = starterPet();
        pet.setBond(99);
        when(petService.getPet(UID)).thenReturn(pet);

        Pet result = rewardService.applyStudySessionCompletionReward(UID, 25 * 60L, false);

        assertThat(result.getBond()).isEqualTo(100);
    }

    // ---------- Level / stage progression ----------

    @Test
    void levelUpsWhenXpCrossesAThreshold() {
        Pet pet = starterPet();
        pet.setXp(80); // 20 short of level 2 (100 XP)
        when(petService.getPet(UID)).thenReturn(pet);

        // 25 min => +50 XP => 130 total => level 2
        Pet result = rewardService.applyStudySessionCompletionReward(UID, 25 * 60L, false);

        assertThat(result.getXp()).isEqualTo(130);
        assertThat(result.getLevel()).isEqualTo(2);
    }

    @Test
    void levelStaysTheSameWhenXpDoesNotCrossAThreshold() {
        Pet pet = starterPet();
        pet.setXp(0);
        when(petService.getPet(UID)).thenReturn(pet);

        Pet result = rewardService.applyStudySessionCompletionReward(UID, 5 * 60L, false); // +10 xp only

        assertThat(result.getLevel()).isEqualTo(1);
    }

    @Test
    void stageAdvancesToChildWhenLevelReachesFive() {
        Pet pet = starterPet();
        pet.setXp(699); // one XP short of level 5 (700 XP)
        pet.setLevel(4);
        pet.setStage(PetStage.BABY);
        when(petService.getPet(UID)).thenReturn(pet);

        Pet result = rewardService.applyStudySessionCompletionReward(UID, 1 * 60L, false); // +2 xp => 701 => level 5

        assertThat(result.getLevel()).isEqualTo(5);
        assertThat(result.getStage()).isEqualTo(PetStage.CHILD);
    }

    @Test
    void stageStaysBabyBelowLevelFive() {
        Pet pet = starterPet();
        pet.setXp(0);
        when(petService.getPet(UID)).thenReturn(pet);

        Pet result = rewardService.applyStudySessionCompletionReward(UID, 5 * 60L, false);

        assertThat(result.getLevel()).isEqualTo(1);
        assertThat(result.getStage()).isEqualTo(PetStage.BABY);
    }

    // ---------- Pet state ----------

    @Test
    void setsPetStateToCelebrating() {
        Pet pet = starterPet();
        when(petService.getPet(UID)).thenReturn(pet);

        Pet result = rewardService.applyStudySessionCompletionReward(UID, 25 * 60L, false);

        assertThat(result.getState()).isEqualTo(PetState.CELEBRATING);
    }

    // ---------- Streak ----------

    @Test
    void firstEverSessionStartsStreakAtOne() {
        Pet pet = starterPet();
        assertThat(pet.getLastStudyDate()).isNull();
        when(petService.getPet(UID)).thenReturn(pet);

        Pet result = rewardService.applyStudySessionCompletionReward(UID, 25 * 60L, false);

        assertThat(result.getCurrentStreak()).isEqualTo(1);
        assertThat(result.getLongestStreak()).isEqualTo(1);
        assertThat(result.getLastStudyDate()).isEqualTo(LocalDate.of(2026, 1, 15));
    }

    @Test
    void consecutiveDayExtendsStreak() {
        Pet pet = starterPet();
        pet.setCurrentStreak(3);
        pet.setLongestStreak(3);
        pet.setLastStudyDate(LocalDate.of(2026, 1, 14)); // yesterday, relative to FIXED_CLOCK
        when(petService.getPet(UID)).thenReturn(pet);

        Pet result = rewardService.applyStudySessionCompletionReward(UID, 25 * 60L, false);

        assertThat(result.getCurrentStreak()).isEqualTo(4);
        assertThat(result.getLongestStreak()).isEqualTo(4);
        assertThat(result.getLastStudyDate()).isEqualTo(LocalDate.of(2026, 1, 15));
    }

    @Test
    void sameDayRepeatDoesNotChangeStreak() {
        Pet pet = starterPet();
        pet.setCurrentStreak(3);
        pet.setLongestStreak(5);
        pet.setLastStudyDate(LocalDate.of(2026, 1, 15)); // today, relative to FIXED_CLOCK
        when(petService.getPet(UID)).thenReturn(pet);

        Pet result = rewardService.applyStudySessionCompletionReward(UID, 25 * 60L, false);

        assertThat(result.getCurrentStreak()).isEqualTo(3);
        assertThat(result.getLongestStreak()).isEqualTo(5);
        assertThat(result.getLastStudyDate()).isEqualTo(LocalDate.of(2026, 1, 15));
    }

    @Test
    void missedDayResetsStreakButKeepsLongest() {
        Pet pet = starterPet();
        pet.setCurrentStreak(10);
        pet.setLongestStreak(10);
        pet.setLastStudyDate(LocalDate.of(2026, 1, 10)); // 5 days ago, gap > 1 day
        when(petService.getPet(UID)).thenReturn(pet);

        Pet result = rewardService.applyStudySessionCompletionReward(UID, 25 * 60L, false);

        assertThat(result.getCurrentStreak()).isEqualTo(1);
        assertThat(result.getLongestStreak()).isEqualTo(10);
        assertThat(result.getLastStudyDate()).isEqualTo(LocalDate.of(2026, 1, 15));
    }

    // ------------------------------------------------------------------

    private Pet starterPet() {
        Pet pet = new Pet();
        pet.setUserId(UID);
        pet.setName("Mochi");
        pet.setSpecies(PetSpecies.CAT);
        pet.setStage(PetStage.BABY);
        pet.setLevel(1);
        pet.setXp(0);
        pet.setCoins(0);
        pet.setHunger(80);
        pet.setMood(90);
        pet.setBond(50);
        pet.setState(PetState.IDLE);
        return pet;
    }
}
