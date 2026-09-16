package com.mochi.mochibackend.task.enums;

/**
 * User-set priority. Purely descriptive in this sprint (sorting/filtering
 * only) — it carries no XP, reward, or scheduling weight yet, but is the
 * obvious field a future AI Study Planning sprint would read to decide
 * what to schedule first.
 */
public enum TaskPriority {
    LOW,
    MEDIUM,
    HIGH
}
