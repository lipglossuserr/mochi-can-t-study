package com.mochi.mochibackend.pet.service;

import com.mochi.mochibackend.pet.enums.PetStage;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LevelCalculatorTest {

    // ---------- xpForLevel / calculateLevel: reference table ----------

    @Test
    void xpForLevelMatchesTheSprintReferenceTable() {
        assertThat(LevelCalculator.xpForLevel(1)).isEqualTo(0);
        assertThat(LevelCalculator.xpForLevel(2)).isEqualTo(100);
        assertThat(LevelCalculator.xpForLevel(3)).isEqualTo(250);
        assertThat(LevelCalculator.xpForLevel(4)).isEqualTo(450);
        assertThat(LevelCalculator.xpForLevel(5)).isEqualTo(700);
    }

    @Test
    void calculateLevelStartsAtOneWithZeroXp() {
        assertThat(LevelCalculator.calculateLevel(0)).isEqualTo(1);
    }

    @Test
    void calculateLevelStaysAtCurrentLevelJustBelowThreshold() {
        assertThat(LevelCalculator.calculateLevel(99)).isEqualTo(1);
        assertThat(LevelCalculator.calculateLevel(249)).isEqualTo(2);
        assertThat(LevelCalculator.calculateLevel(449)).isEqualTo(3);
        assertThat(LevelCalculator.calculateLevel(699)).isEqualTo(4);
    }

    @Test
    void calculateLevelAdvancesExactlyAtThreshold() {
        assertThat(LevelCalculator.calculateLevel(100)).isEqualTo(2);
        assertThat(LevelCalculator.calculateLevel(250)).isEqualTo(3);
        assertThat(LevelCalculator.calculateLevel(450)).isEqualTo(4);
        assertThat(LevelCalculator.calculateLevel(700)).isEqualTo(5);
    }

    @Test
    void calculateLevelKeepsClimbingPastTheReferenceTableOnTheSameCurve() {
        // Level 6 requires 700 + (100 + 50*4) = 700 + 300 = 1000
        assertThat(LevelCalculator.xpForLevel(6)).isEqualTo(1000);
        assertThat(LevelCalculator.calculateLevel(999)).isEqualTo(5);
        assertThat(LevelCalculator.calculateLevel(1000)).isEqualTo(6);
    }

    // ---------- calculateStage ----------

    @Test
    void babyStageCoversLevelsOneThroughFour() {
        assertThat(LevelCalculator.calculateStage(1)).isEqualTo(PetStage.BABY);
        assertThat(LevelCalculator.calculateStage(4)).isEqualTo(PetStage.BABY);
    }

    @Test
    void childStageCoversLevelsFiveThroughFourteen() {
        assertThat(LevelCalculator.calculateStage(5)).isEqualTo(PetStage.CHILD);
        assertThat(LevelCalculator.calculateStage(14)).isEqualTo(PetStage.CHILD);
    }

    @Test
    void adultStageStartsAtLevelFifteen() {
        assertThat(LevelCalculator.calculateStage(15)).isEqualTo(PetStage.ADULT);
        assertThat(LevelCalculator.calculateStage(30)).isEqualTo(PetStage.ADULT);
    }
}
