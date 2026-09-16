import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CharacterStateMachine } from '../features/character/state/CharacterStateMachine'

describe('CharacterStateMachine', () => {
  let onChange: ReturnType<typeof vi.fn>
  let sm: CharacterStateMachine

  beforeEach(() => {
    vi.useFakeTimers()
    onChange = vi.fn()
    sm = new CharacterStateMachine(onChange)
  })

  afterEach(() => {
    sm.dispose()
    vi.useRealTimers()
  })

  // --- Initial state ---

  it('initialises with idle base state', () => {
    expect(sm.baseState).toBe('idle')
    expect(sm.overlayState).toBeNull()
    expect(sm.displayState).toBe('idle')
  })

  it('does not call onChange on construction', () => {
    expect(onChange).not.toHaveBeenCalled()
  })

  // --- Base state ---

  it('setBase changes the base state and calls onChange', () => {
    sm.setBase('studying')
    expect(sm.baseState).toBe('studying')
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('setBase is a no-op if the base is already set to that state', () => {
    sm.setBase('idle')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('setBase while an overlay is active does NOT call onChange', () => {
    sm.pushOverlay('eating', 1000)
    onChange.mockClear()
    sm.setBase('sleeping')
    expect(onChange).not.toHaveBeenCalled()
    expect(sm.baseState).toBe('sleeping')
    // overlay is still showing
    expect(sm.displayState).toBe('eating')
  })

  // --- Overlay state ---

  it('pushOverlay shows the overlay in displayState', () => {
    sm.pushOverlay('eating', 1000)
    expect(sm.overlayState).toBe('eating')
    expect(sm.displayState).toBe('eating')
    expect(sm.baseState).toBe('idle')
  })

  it('overlay expires after its duration and restores base', () => {
    sm.pushOverlay('eating', 1000)
    onChange.mockClear()
    vi.advanceTimersByTime(1000)
    expect(sm.overlayState).toBeNull()
    expect(sm.displayState).toBe('idle')
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('higher-priority overlay displaces lower-priority overlay', () => {
    sm.pushOverlay('being-petted', 1000) // priority 10
    sm.pushOverlay('celebrating', 1000)   // priority 30
    expect(sm.displayState).toBe('celebrating')
  })

  it('lower-priority overlay is rejected when higher is active', () => {
    sm.pushOverlay('celebrating', 1000)   // priority 30
    const pushed = sm.pushOverlay('being-petted', 1000) // priority 10
    expect(pushed).toBe(false)
    expect(sm.displayState).toBe('celebrating')
  })

  it('equal-priority overlay replaces the current overlay', () => {
    sm.pushOverlay('eating', 500)   // priority 20
    sm.pushOverlay('playing', 500)  // priority 20
    expect(sm.displayState).toBe('playing')
  })

  // --- clearOverlay ---

  it('clearOverlay removes the overlay immediately', () => {
    sm.pushOverlay('eating', 5000)
    sm.clearOverlay()
    expect(sm.overlayState).toBeNull()
    expect(sm.displayState).toBe('idle')
  })

  it('clearOverlay is safe when no overlay is active', () => {
    expect(() => sm.clearOverlay()).not.toThrow()
    expect(onChange).not.toHaveBeenCalled()
  })

  // --- Runtime state registration ---

  it('registerState allows custom states to be used as overlays', () => {
    sm.registerState({ id: 'dancing', priority: 25 })
    const pushed = sm.pushOverlay('dancing', 500)
    expect(pushed).toBe(true)
    expect(sm.displayState).toBe('dancing')
  })

  it('unknown state defaults to priority 0 and can be displaced by any registered state', () => {
    sm.pushOverlay('some-future-state', 5000) // unregistered → priority 0
    const displaced = sm.pushOverlay('being-petted', 1000) // priority 10
    expect(displaced).toBe(true)
    expect(sm.displayState).toBe('being-petted')
  })
})
