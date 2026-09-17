package com.mochi.mochibackend.pet.config;

/**
 * Single home for every reward/progression number, so nothing is
 * scattered as magic numbers through {@code RewardService} or
 * {@code LevelCalculator}. Mirrors the {@code FocusPolicy} pattern used
 * for study-session thresholds. Values are the Sprint 4B defaults from
 * the project requirements — tune here, nowhere else.
 */
public final class RewardPolicy {

    private RewardPolicy() {
    }

    // ---------- Study session completion rewards ----------

    /** XP granted per completed minute of studying. */
    public static final int XP_PER_MINUTE = 2;

    /** Coins granted per completed minute of studying. */
    public static final int COINS_PER_MINUTE = 1;

    /** Flat mood increase on a completed study session. */
    public static final int MOOD_REWARD = 5;

    /** Flat bond increase on a completed study session. */
    public static final int BOND_REWARD = 3;

    /**
     * Multiplier applied to XP/coins for a study session linked to a
     * co-study room (StudySession.roomId != null) — studying alongside
     * others is rewarded more than the same minutes studied solo.
     * Applied only on top of an already-VALID/PARTIAL completion; a
     * room session that ends up INVALID gets no reward at all regardless
     * of this multiplier, same as a solo session would.
     */
    public static final double ROOM_SESSION_BONUS_MULTIPLIER = 1.5;

    // ---------- Task completion rewards ----------
    // Scaled by priority so the priority a person sets on a task
    // actually means something instead of being decorative — see
    // TaskPriority's own doc comment ("purely descriptive... the
    // obvious field a future sprint would read to decide what to
    // schedule first"). This is that field's first real consumer.
    // Deliberately lighter than a study session's per-minute reward —
    // completing a task is a quick win, not a sustained effort.

    public static final int TASK_XP_LOW = 8;
    public static final int TASK_XP_MEDIUM = 15;
    public static final int TASK_XP_HIGH = 25;

    public static final int TASK_COINS_LOW = 3;
    public static final int TASK_COINS_MEDIUM = 6;
    public static final int TASK_COINS_HIGH = 10;

    /** Flat mood increase on any completed task, any priority. */
    public static final int TASK_MOOD_REWARD = 3;

    // ---------- Stat bounds ----------

    public static final int MIN_STAT = 0;

    public static final int MAX_STAT = 100;

    // ---------- Level curve ----------
    // XP required for level N (N >= 2) follows an arithmetic-of-differences
    // curve: the XP needed for the next level starts at LEVEL_XP_BASE and
    // grows by LEVEL_XP_STEP each level. This reproduces the sprint's
    // reference table (L1=0, L2=100, L3=250, L4=450, L5=700) and keeps
    // extending it indefinitely without hardcoding a level-by-level table.

    /** XP needed to go from level 1 to level 2. */
    public static final int LEVEL_XP_BASE = 100;

    /** How much more XP each subsequent level requires than the last. */
    public static final int LEVEL_XP_STEP = 50;

    // ---------- Stage thresholds ----------

    /** Minimum level for the CHILD stage (levels below this are BABY). */
    public static final int CHILD_MIN_LEVEL = 5;

    /** Minimum level for the ADULT stage. */
    public static final int ADULT_MIN_LEVEL = 15;

    // ---------- Flashcard deck completion rewards ----------
    // Scales with card count, same reasoning as study-session reward
    // scaling with minutes — a 30-card deck represents more study than
    // a 10-card one. 10 cards -> 20 XP / 5 coins, matching the numbers
    // in the feature spec exactly.

    public static final int FLASHCARD_XP_PER_CARD = 2;
    public static final int FLASHCARD_COINS_DIVISOR = 2;
    public static final int FLASHCARD_MIN_COINS = 1;

    /** Flat mood increase on a completed deck, any card count. */
    public static final int FLASHCARD_MOOD_REWARD = 4;
}
