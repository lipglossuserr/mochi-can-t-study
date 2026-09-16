package com.mochi.mochibackend.achievement.service;

import com.mochi.mochibackend.achievement.definition.AchievementDefinition;
import com.mochi.mochibackend.achievement.definition.AchievementStats;
import com.mochi.mochibackend.achievement.dto.AchievementResponse;
import com.mochi.mochibackend.achievement.entity.UserAchievement;
import com.mochi.mochibackend.achievement.repository.UserAchievementRepository;
import com.mochi.mochibackend.model.SessionStatus;
import com.mochi.mochibackend.pet.entity.Pet;
import com.mochi.mochibackend.repository.StudySessionRepository;
import com.mochi.mochibackend.task.enums.TaskStatus;
import com.mochi.mochibackend.task.repository.TaskRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Turns "does this user now meet an achievement's criteria" into a
 * persisted unlock, and answers "show me this user's full achievement
 * catalog with unlock state" for the Profile page.
 * <p>
 * Deliberately called from {@code StudySessionService.complete}, right
 * after {@code RewardService} has already saved the pet — this service
 * only ever reads the pet it's handed, it never mutates or re-saves it,
 * so it has no bearing on the pet-save transaction it rides along with.
 */
@Service
public class AchievementService {

    private final UserAchievementRepository userAchievementRepository;
    private final StudySessionRepository studySessionRepository;
    private final TaskRepository taskRepository;

    public AchievementService(UserAchievementRepository userAchievementRepository,
                               StudySessionRepository studySessionRepository,
                               TaskRepository taskRepository) {
        this.userAchievementRepository = userAchievementRepository;
        this.studySessionRepository = studySessionRepository;
        this.taskRepository = taskRepository;
    }

    /**
     * Checks every {@link AchievementDefinition} the user hasn't already
     * unlocked against their current stats (derived from the just-saved
     * {@code pet} plus a fresh count of completed sessions/tasks), and
     * persists any newly-met ones.
     *
     * @return the achievements newly unlocked by this call, if any —
     *         empty when nothing new was earned
     */
    @Transactional
    public List<AchievementDefinition> checkAndUnlock(String userId, Pet pet) {
        AchievementStats stats = new AchievementStats(
                pet.getCurrentStreak(),
                (int) studySessionRepository.countByUserUidAndStatus(userId, SessionStatus.COMPLETED),
                pet.getLevel(),
                (int) taskRepository.countByUserUidAndStatus(userId, TaskStatus.COMPLETED)
        );

        List<AchievementDefinition> newlyUnlocked = new ArrayList<>();

        for (AchievementDefinition definition : AchievementDefinition.values()) {
            if (!definition.isMetBy(stats)) {
                continue;
            }
            if (userAchievementRepository.existsByUserIdAndAchievementKey(userId, definition.getKey())) {
                continue;
            }

            if (tryUnlock(userId, definition)) {
                newlyUnlocked.add(definition);
            }
        }

        return newlyUnlocked;
    }

    /** The full catalog for this user, each entry flagged with whether/when it was unlocked. */
    @Transactional(readOnly = true)
    public List<AchievementResponse> listForUser(String userId) {
        Map<String, UserAchievement> unlocked = userAchievementRepository.findAllByUserId(userId).stream()
                .collect(Collectors.toMap(UserAchievement::getAchievementKey, Function.identity()));

        return Arrays.stream(AchievementDefinition.values())
                .map(definition -> {
                    UserAchievement match = unlocked.get(definition.getKey());
                    return new AchievementResponse(
                            definition.getKey(),
                            definition.getTitle(),
                            definition.getDescription(),
                            definition.getEmoji(),
                            match != null,
                            match != null ? match.getUnlockedAt() : null
                    );
                })
                .toList();
    }

    /**
     * @return true if this call is the one that persisted the unlock,
     *         false if a racing request beat it to the same (user_id,
     *         achievement_key) pair — the unique constraint makes that
     *         race harmless rather than a crash, same pattern
     *         {@code PetService.createStarterPet} uses.
     */
    private boolean tryUnlock(String userId, AchievementDefinition definition) {
        UserAchievement unlock = new UserAchievement();
        unlock.setUserId(userId);
        unlock.setAchievementKey(definition.getKey());

        try {
            userAchievementRepository.saveAndFlush(unlock);
            return true;
        } catch (DataIntegrityViolationException ex) {
            return false;
        }
    }
}
