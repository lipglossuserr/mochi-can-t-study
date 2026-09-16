package com.mochi.mochibackend.achievement.repository;

import com.mochi.mochibackend.achievement.entity.UserAchievement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserAchievementRepository extends JpaRepository<UserAchievement, Long> {

    List<UserAchievement> findAllByUserId(String userId);

    boolean existsByUserIdAndAchievementKey(String userId, String achievementKey);
}
