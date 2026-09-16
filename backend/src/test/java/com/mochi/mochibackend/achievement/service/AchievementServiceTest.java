package com.mochi.mochibackend.achievement.service;

import com.mochi.mochibackend.achievement.definition.AchievementDefinition;
import com.mochi.mochibackend.achievement.entity.UserAchievement;
import com.mochi.mochibackend.achievement.repository.UserAchievementRepository;
import com.mochi.mochibackend.model.SessionStatus;
import com.mochi.mochibackend.pet.entity.Pet;
import com.mochi.mochibackend.pet.enums.PetSpecies;
import com.mochi.mochibackend.pet.enums.PetStage;
import com.mochi.mochibackend.pet.enums.PetState;
import com.mochi.mochibackend.repository.StudySessionRepository;
import com.mochi.mochibackend.task.enums.TaskStatus;
import com.mochi.mochibackend.task.repository.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AchievementServiceTest {

    private static final String UID = "user-abc";

    @Mock
    private UserAchievementRepository userAchievementRepository;

    @Mock
    private StudySessionRepository studySessionRepository;

    @Mock
    private TaskRepository taskRepository;

    private AchievementService achievementService;

    @BeforeEach
    void setUp() {
        achievementService = new AchievementService(userAchievementRepository, studySessionRepository, taskRepository);

        lenient().when(userAchievementRepository.saveAndFlush(any(UserAchievement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(studySessionRepository.countByUserUidAndStatus(UID, SessionStatus.COMPLETED)).thenReturn(0L);
        lenient().when(taskRepository.countByUserUidAndStatus(UID, TaskStatus.COMPLETED)).thenReturn(0L);
    }

    @Test
    void unlocksFirstSessionOnTheFirstEverCompletion() {
        when(studySessionRepository.countByUserUidAndStatus(UID, SessionStatus.COMPLETED)).thenReturn(1L);

        List<AchievementDefinition> unlocked = achievementService.checkAndUnlock(UID, starterPet());

        assertThat(unlocked).contains(AchievementDefinition.FIRST_SESSION);
    }

    @Test
    void doesNotReUnlockAnAlreadyUnlockedAchievement() {
        when(studySessionRepository.countByUserUidAndStatus(UID, SessionStatus.COMPLETED)).thenReturn(1L);
        when(userAchievementRepository.existsByUserIdAndAchievementKey(UID, AchievementDefinition.FIRST_SESSION.getKey()))
                .thenReturn(true);

        List<AchievementDefinition> unlocked = achievementService.checkAndUnlock(UID, starterPet());

        assertThat(unlocked).doesNotContain(AchievementDefinition.FIRST_SESSION);
        verify(userAchievementRepository, never()).saveAndFlush(any(UserAchievement.class));
    }

    @Test
    void unlocksStreakAchievementsBasedOnPetsCurrentStreak() {
        Pet pet = starterPet();
        pet.setCurrentStreak(7);

        List<AchievementDefinition> unlocked = achievementService.checkAndUnlock(UID, pet);

        assertThat(unlocked).contains(AchievementDefinition.STREAK_3, AchievementDefinition.STREAK_7);
        assertThat(unlocked).doesNotContain(AchievementDefinition.STREAK_30);
    }

    @Test
    void unlocksLevelAchievementsBasedOnPetsLevel() {
        Pet pet = starterPet();
        pet.setLevel(5);

        List<AchievementDefinition> unlocked = achievementService.checkAndUnlock(UID, pet);

        assertThat(unlocked).contains(AchievementDefinition.LEVEL_5);
        assertThat(unlocked).doesNotContain(AchievementDefinition.LEVEL_15);
    }

    @Test
    void unlocksTaskAchievementBasedOnCompletedTaskCount() {
        when(taskRepository.countByUserUidAndStatus(UID, TaskStatus.COMPLETED)).thenReturn(25L);

        List<AchievementDefinition> unlocked = achievementService.checkAndUnlock(UID, starterPet());

        assertThat(unlocked).contains(AchievementDefinition.TASKS_25);
    }

    @Test
    void unlocksNothingWhenNoCriteriaAreMet() {
        List<AchievementDefinition> unlocked = achievementService.checkAndUnlock(UID, starterPet());

        assertThat(unlocked).isEmpty();
    }

    @Test
    void listForUserReturnsFullCatalogWithUnlockStateAndTimestamp() {
        UserAchievement unlockedRow = new UserAchievement();
        unlockedRow.setUserId(UID);
        unlockedRow.setAchievementKey(AchievementDefinition.FIRST_SESSION.getKey());
        unlockedRow.setUnlockedAt(Instant.parse("2026-01-15T12:00:00Z"));

        when(userAchievementRepository.findAllByUserId(UID)).thenReturn(List.of(unlockedRow));

        var catalog = achievementService.listForUser(UID);

        assertThat(catalog).hasSize(AchievementDefinition.values().length);

        var firstSession = catalog.stream()
                .filter(entry -> entry.getKey().equals(AchievementDefinition.FIRST_SESSION.getKey()))
                .findFirst()
                .orElseThrow();
        assertThat(firstSession.isUnlocked()).isTrue();
        assertThat(firstSession.getUnlockedAt()).isEqualTo(Instant.parse("2026-01-15T12:00:00Z"));

        var streak30 = catalog.stream()
                .filter(entry -> entry.getKey().equals(AchievementDefinition.STREAK_30.getKey()))
                .findFirst()
                .orElseThrow();
        assertThat(streak30.isUnlocked()).isFalse();
        assertThat(streak30.getUnlockedAt()).isNull();
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
        pet.setCurrentStreak(0);
        pet.setLongestStreak(0);
        return pet;
    }
}
