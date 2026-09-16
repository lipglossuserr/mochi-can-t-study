package com.mochi.mochibackend.task.enums;

/**
 * Lifecycle of a task. Intentionally binary for this sprint — no
 * IN_PROGRESS state, since nothing in Sprint 7.2A ever sets one (a
 * status a caller can never reach is a placeholder, not a feature).
 * Sprint 7.2B, which links study sessions to tasks, is the natural
 * place to reconsider a richer lifecycle if it turns out to need one.
 */
public enum TaskStatus {
    PENDING,
    COMPLETED
}
