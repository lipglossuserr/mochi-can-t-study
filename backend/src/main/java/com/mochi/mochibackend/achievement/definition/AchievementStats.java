package com.mochi.mochibackend.achievement.definition;

/**
 * The current snapshot of a user's progress that every
 * {@link AchievementDefinition}'s criteria is evaluated against.
 * Deliberately just the four numbers achievements care about today,
 * not a grab-bag of every stat that exists — add a field here only
 * when an actual achievement needs it.
 */
public record AchievementStats(
        int currentStreak,
        int totalCompletedSessions,
        int level,
        int tasksCompleted
) {
}
