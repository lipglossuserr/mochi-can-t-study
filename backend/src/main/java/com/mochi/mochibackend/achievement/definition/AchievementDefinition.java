package com.mochi.mochibackend.achievement.definition;

import java.util.function.Predicate;

/**
 * The fixed catalog of every achievement in the app. Mirrors the
 * {@code RewardPolicy}/{@code LevelCalculator} pattern: a single home
 * for tunable game-design values, not scattered magic numbers. Nothing
 * here is user-specific — {@code AchievementService} is what turns
 * "does this user meet this definition's criteria" into a persisted
 * unlock.
 * <p>
 * Adding a new achievement is exactly one new enum constant; nothing
 * else in the pipeline (service, controller, DTO, frontend card) needs
 * to change shape.
 */
public enum AchievementDefinition {

    FIRST_SESSION(
            "first_session", "First Steps", "Complete your first study session", "🌱",
            stats -> stats.totalCompletedSessions() >= 1
    ),
    STREAK_3(
            "streak_3", "On a Roll", "Reach a 3-day study streak", "🔥",
            stats -> stats.currentStreak() >= 3
    ),
    STREAK_7(
            "streak_7", "Week Warrior", "Reach a 7-day study streak", "🔥",
            stats -> stats.currentStreak() >= 7
    ),
    STREAK_30(
            "streak_30", "Unstoppable", "Reach a 30-day study streak", "🏆",
            stats -> stats.currentStreak() >= 30
    ),
    SESSIONS_10(
            "sessions_10", "Getting Started", "Complete 10 study sessions", "📚",
            stats -> stats.totalCompletedSessions() >= 10
    ),
    SESSIONS_50(
            "sessions_50", "Dedicated Student", "Complete 50 study sessions", "📖",
            stats -> stats.totalCompletedSessions() >= 50
    ),
    LEVEL_5(
            "level_5", "Growing Up", "Reach pet level 5", "⭐",
            stats -> stats.level() >= 5
    ),
    LEVEL_15(
            "level_15", "All Grown Up", "Reach pet level 15", "🌟",
            stats -> stats.level() >= 15
    ),
    TASKS_25(
            "tasks_25", "Task Master", "Complete 25 tasks", "✅",
            stats -> stats.tasksCompleted() >= 25
    );

    private final String key;
    private final String title;
    private final String description;
    private final String emoji;
    private final Predicate<AchievementStats> criteria;

    AchievementDefinition(String key, String title, String description, String emoji,
                           Predicate<AchievementStats> criteria) {
        this.key = key;
        this.title = title;
        this.description = description;
        this.emoji = emoji;
        this.criteria = criteria;
    }

    public String getKey() {
        return key;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getEmoji() {
        return emoji;
    }

    public boolean isMetBy(AchievementStats stats) {
        return criteria.test(stats);
    }
}
