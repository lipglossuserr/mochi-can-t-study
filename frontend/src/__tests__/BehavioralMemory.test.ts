import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BehavioralMemory } from '../features/character/behavior/BehavioralMemory'

describe('BehavioralMemory', () => {
  let onChange: ReturnType<typeof vi.fn>
  let memory: BehavioralMemory

  beforeEach(() => {
    vi.useFakeTimers()
    onChange = vi.fn()
    memory = new BehavioralMemory(onChange)
  })

  afterEach(() => {
    memory.dispose()
    vi.useRealTimers()
  })

  // --- Initial state ---

  it('dominant is null initially', () => {
    expect(memory.dominant).toBeNull()
  })

  it('comfort is 0 initially', () => {
    expect(memory.comfort).toBe(0)
  })

  // --- record() ---

  it('record sets dominant to fresh phase', () => {
    memory.record('fed')
    expect(memory.dominant).toEqual({ kind: 'fed', phase: 'fresh' })
  })

  it('record calls onChange', () => {
    memory.record('played')
    expect(onChange).toHaveBeenCalled()
  })

  it('record replaces a previous influence', () => {
    memory.record('fed')
    memory.record('petted')
    expect(memory.dominant?.kind).toBe('petted')
  })

  it('record increases comfort', () => {
    memory.record('fed')
    expect(memory.comfort).toBeGreaterThan(0)
  })

  it('multiple records accumulate comfort up to cap of 1', () => {
    for (let i = 0; i < 20; i++) memory.record('petted')
    expect(memory.comfort).toBeLessThanOrEqual(1)
  })

  // --- Phase transitions ---

  it('dominant transitions to fading after FADE_START_RATIO of duration', () => {
    // fed duration = 100_000ms, fade starts at 55% = 55_000ms
    memory.record('fed')
    onChange.mockClear()
    vi.advanceTimersByTime(55_001)
    expect(memory.dominant?.phase).toBe('fading')
    expect(onChange).toHaveBeenCalled()
  })

  it('dominant becomes null after the full duration', () => {
    memory.record('fed') // duration 100_000ms
    vi.advanceTimersByTime(100_001)
    expect(memory.dominant).toBeNull()
  })

  // --- boost parameter ---

  it('boost > 1 increases comfort increment proportionally', () => {
    memory.record('fed', 1)
    const comfortBase = memory.comfort
    memory.dispose()

    vi.useRealTimers()
    vi.useFakeTimers()
    onChange = vi.fn()
    memory = new BehavioralMemory(onChange)

    memory.record('fed', 2)
    const comfortBoosted = memory.comfort
    expect(comfortBoosted).toBeGreaterThan(comfortBase)
  })

  it('boost does not push comfort above 1', () => {
    memory.record('fed', 100)
    expect(memory.comfort).toBeLessThanOrEqual(1)
  })

  // --- dispose ---

  it('dispose clears dominant', () => {
    memory.record('fed')
    memory.dispose()
    expect(memory.dominant).toBeNull()
  })
})
