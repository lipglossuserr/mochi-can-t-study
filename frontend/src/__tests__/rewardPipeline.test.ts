import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  computeRewardDiff,
  isRewardDiffMeaningful,
  hasCelebrated,
  markCelebrated,
  type RewardSourceRef,
} from '../features/pet/utils/rewardPipeline'
import type { Pet } from '../features/pet/types/pet'

function makePet(overrides: Partial<Pet> = {}): Pet {
  return {
    name: 'Mochi',
    level: 1,
    xp: 0,
    coins: 0,
    mood: 50,
    hunger: 50,
    bond: 50,
    stage: 'baby',
    state: 'IDLE',
    currentStreak: 0,
    longestStreak: 0,
    equippedSkin: 'skin-orange',
    ...overrides,
  }
}

/** Minimal in-memory localStorage — this project's vitest run has no jsdom environment configured. */
function makeMockLocalStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => store.clear(),
  }
}

describe('rewardPipeline — computeRewardDiff', () => {
  it('reports zero gain when nothing changed', () => {
    const pet = makePet({ level: 2, xp: 30, coins: 10 })
    const diff = computeRewardDiff(pet, pet)
    expect(diff).toEqual({ xpGained: 0, coinsGained: 0, leveledUp: false, streakGained: false, newStreak: 0 })
    expect(isRewardDiffMeaningful(diff)).toBe(false)
  })

  it('reports a plain xp/coin gain within the same level', () => {
    const before = makePet({ level: 2, xp: 30, coins: 10 })
    const after = makePet({ level: 2, xp: 55, coins: 35 })
    const diff = computeRewardDiff(before, after)
    expect(diff).toEqual({ xpGained: 25, coinsGained: 25, leveledUp: false, streakGained: false, newStreak: 0 })
    expect(isRewardDiffMeaningful(diff)).toBe(true)
  })

  it('computes xpGained as a plain subtraction across a level-up too (xp is cumulative, confirmed against RewardService.java)', () => {
    // xpForLevel(2) = 100, xpForLevel(3) = 250 (LevelCalculator's exact
    // reference table) — 180 cumulative xp is level 2; +90 lands at 270
    // cumulative, which is level 3.
    const before = makePet({ level: 2, xp: 180, coins: 5 })
    const after = makePet({ level: 3, xp: 270, coins: 5 })
    const diff = computeRewardDiff(before, after)
    expect(diff.leveledUp).toBe(true)
    expect(diff.xpGained).toBe(90)
    expect(diff.coinsGained).toBe(0)
    expect(isRewardDiffMeaningful(diff)).toBe(true)
  })

  it('never reports a negative gain even if coins somehow decreased', () => {
    const before = makePet({ coins: 50 })
    const after = makePet({ coins: 40 })
    const diff = computeRewardDiff(before, after)
    expect(diff.coinsGained).toBe(0)
  })
})

describe('rewardPipeline — celebrated-event dedup', () => {
  const ref: RewardSourceRef = { type: 'study-session', id: 42 }
  const otherRef: RewardSourceRef = { type: 'study-session', id: 43 }

  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: makeMockLocalStorage() })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is false for an event that has never been marked', () => {
    expect(hasCelebrated(ref)).toBe(false)
  })

  it('becomes true after marking, and does not affect a different ref', () => {
    markCelebrated(ref)
    expect(hasCelebrated(ref)).toBe(true)
    expect(hasCelebrated(otherRef)).toBe(false)
  })

  it('marking the same ref twice is idempotent (no duplicate entries, still true)', () => {
    markCelebrated(ref)
    markCelebrated(ref)
    expect(hasCelebrated(ref)).toBe(true)
  })

  it('distinguishes by source type as well as id', () => {
    markCelebrated({ type: 'study-session', id: 1 })
    expect(hasCelebrated({ type: 'task', id: 1 })).toBe(false)
  })

  it('fails open (never throws) when window/localStorage is unavailable', () => {
    vi.stubGlobal('window', undefined)
    expect(() => hasCelebrated(ref)).not.toThrow()
    expect(hasCelebrated(ref)).toBe(false)
    expect(() => markCelebrated(ref)).not.toThrow()
  })
})
