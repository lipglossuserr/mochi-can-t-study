import type { Pet } from '../types/pet'

/**
 * XP progression math.
 *
 * Sprint 7.1A: this file previously *assumed* xp reset to 0 each level
 * and that every level cost a flat `level * 100` — neither is true. With
 * the backend source now available (`LevelCalculator.java` /
 * `RewardPolicy.java`), this is a direct, verified port of the real
 * formulas rather than a guess:
 *
 * 1. `pet.xp` is a CUMULATIVE lifetime total. `RewardService.java` does
 *    `pet.setXp(pet.getXp() + xpGained)` — it never resets on level-up.
 *    `level` is *derived* from that total (`calculateLevel`), it isn't
 *    tracked as a separate counter that resets xp underneath it.
 * 2. The curve is an "increasing differences" curve, not flat: the XP
 *    needed to go from level n to n+1 starts at `LEVEL_XP_BASE` and
 *    grows by `LEVEL_XP_STEP` every level. `xpForLevel()` below is a
 *    straight port of `LevelCalculator.xpForLevel`, reproducing the
 *    reference table exactly: L1=0, L2=100, L3=250, L4=450, L5=700
 *    (cumulative).
 *
 * If the backend's curve constants ever change, only `LEVEL_XP_BASE`/
 * `LEVEL_XP_STEP` here need to change to match — every component still
 * only ever consumes `getXpProgress()`, never the raw fields.
 */
const LEVEL_XP_BASE = 100
const LEVEL_XP_STEP = 50

/**
 * Total cumulative XP required to have reached `level`. Level 1 always
 * requires 0 XP (the starter level) — mirrors `LevelCalculator.xpForLevel`.
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  const n = level - 1
  return LEVEL_XP_BASE * n + (LEVEL_XP_STEP * n * (n - 1)) / 2
}

export interface XpProgress {
  current: number
  required: number
  percent: number
}

/**
 * Progress within the pet's CURRENT level, derived from its cumulative
 * `xp` and the same curve the backend uses to derive `level` from it.
 */
export function getXpProgress(pet: Pick<Pet, 'level' | 'xp'>): XpProgress {
  const floor = xpForLevel(pet.level)
  const ceiling = xpForLevel(pet.level + 1)
  const required = Math.max(1, ceiling - floor)
  const current = Math.max(0, Math.min(pet.xp - floor, required))
  const percent = Math.round((current / required) * 100)
  return { current, required, percent }
}
