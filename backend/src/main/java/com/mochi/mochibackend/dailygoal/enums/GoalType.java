package com.mochi.mochibackend.dailygoal.enums;

/**
 * What a {@code DailyGoal} is tracking. Purely descriptive in this sprint
 * — nothing yet writes to {@code current} automatically. It exists so a
 * future sprint (auto progress updates from study/tasks, explicitly out
 * of scope here — see Sprint 7.4A notes) has a field to dispatch on
 * instead of having to add one later and backfill existing rows, the
 * same role {@code TaskPriority} plays for Tasks today.
 */
public enum GoalType {
    /** Minutes of study time accumulated on the goal's date. */
    STUDY_MINUTES,
    /** Number of tasks completed on the goal's date. */
    TASKS_COMPLETED,
    /** Anything else the user (or a future preset) defines by hand. */
    CUSTOM
}
