package com.mochi.mochibackend.pet.service;

import com.mochi.mochibackend.pet.config.RewardPolicy;
import com.mochi.mochibackend.pet.enums.PetStage;

/**
 * Pure, stateless level and stage progression math. No dozens of
 * hardcoded {@code if}/{@code switch} branches per level — both the XP
 * curve and the level itself are derived formulaically from
 * {@link RewardPolicy}, so tuning the curve only ever means changing the
 * constants there.
 * <p>
 * The XP curve is an "increasing differences" curve: the XP required to
 * go from level {@code n} to {@code n + 1} starts at
 * {@link RewardPolicy#LEVEL_XP_BASE} and grows by
 * {@link RewardPolicy#LEVEL_XP_STEP} every level. This reproduces the
 * sprint's reference table exactly:
 * <pre>
 *   Level 1 =   0 XP
 *   Level 2 = 100 XP
 *   Level 3 = 250 XP
 *   Level 4 = 450 XP
 *   Level 5 = 700 XP
 * </pre>
 * and keeps extending sensibly beyond level 5 without further tables.
 */
public final class LevelCalculator {

    private LevelCalculator() {
    }

    /**
     * Total XP required to have reached {@code level}. Level 1 always
     * requires 0 XP (the starter level).
     */
    public static int xpForLevel(int level) {
        if (level <= 1) {
            return 0;
        }
        int n = level - 1;
        return RewardPolicy.LEVEL_XP_BASE * n
                + RewardPolicy.LEVEL_XP_STEP * n * (n - 1) / 2;
    }

    /**
     * The level implied by a total XP amount: the highest level whose
     * XP requirement has been met. Never returns less than level 1.
     */
    public static int calculateLevel(int totalXp) {
        int level = 1;
        while (totalXp >= xpForLevel(level + 1)) {
            level++;
        }
        return level;
    }

    /**
     * The growth stage implied by a level:
     * levels 1-4 = BABY, 5-14 = CHILD, 15+ = ADULT.
     */
    public static PetStage calculateStage(int level) {
        if (level >= RewardPolicy.ADULT_MIN_LEVEL) {
            return PetStage.ADULT;
        }
        if (level >= RewardPolicy.CHILD_MIN_LEVEL) {
            return PetStage.CHILD;
        }
        return PetStage.BABY;
    }
}
