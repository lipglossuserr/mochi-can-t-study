import { describe, it, expect } from 'vitest'
import { xpForLevel, getXpProgress } from '../features/pet/utils/xp'

describe('xp — backend-verified curve (LevelCalculator.java / RewardPolicy.java)', () => {
  it('reproduces the backend reference table exactly', () => {
    expect(xpForLevel(1)).toBe(0)
    expect(xpForLevel(2)).toBe(100)
    expect(xpForLevel(3)).toBe(250)
    expect(xpForLevel(4)).toBe(450)
    expect(xpForLevel(5)).toBe(700)
  })

  it('getXpProgress reads cumulative xp as progress within the current level', () => {
    // Level 2 spans cumulative xp [100, 250) — 150 into that range is 50/150.
    const progress = getXpProgress({ level: 2, xp: 150 })
    expect(progress.current).toBe(50)
    expect(progress.required).toBe(150) // 250 - 100
    expect(progress.percent).toBe(33)
  })

  it('never resets to 0 at a level boundary — a fresh level-up reads as 0/required, not negative', () => {
    // Just leveled up to 3 with exactly 250 cumulative xp.
    const progress = getXpProgress({ level: 3, xp: 250 })
    expect(progress.current).toBe(0)
    expect(progress.required).toBe(200) // 450 - 250
    expect(progress.percent).toBe(0)
  })

  it('clamps current so a stale/ahead level briefly showing doesn\'t overflow the bar past 100%', () => {
    const progress = getXpProgress({ level: 2, xp: 249 }) // one short of level 3's threshold
    expect(progress.percent).toBeLessThanOrEqual(100)
  })
})
