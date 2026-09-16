import { describe, it, expect, vi } from 'vitest'
import { runTaskCompletion } from '../features/tasks/runTaskCompletion'

describe('runTaskCompletion — Sprint 7.1B task reward integration', () => {
  it('completes the task then triggers celebrateReward with a task RewardSourceRef', async () => {
    const completeTask = vi.fn().mockResolvedValue(undefined)
    const celebrateReward = vi.fn().mockResolvedValue(undefined)

    const result = await runTaskCompletion(7, { completeTask, celebrateReward })

    expect(result).toEqual({ ok: true })
    expect(completeTask).toHaveBeenCalledWith(7)
    expect(celebrateReward).toHaveBeenCalledWith({ type: 'task', id: 7 })
  })

  it('calls completeTask before celebrateReward, never the reverse', async () => {
    const calls: string[] = []
    const completeTask = vi.fn().mockImplementation(async () => {
      calls.push('completeTask')
    })
    const celebrateReward = vi.fn().mockImplementation(async () => {
      calls.push('celebrateReward')
    })

    await runTaskCompletion(1, { completeTask, celebrateReward })

    expect(calls).toEqual(['completeTask', 'celebrateReward'])
  })

  it('does not call celebrateReward if completeTask fails', async () => {
    const completeTask = vi.fn().mockRejectedValue(new Error('network error'))
    const celebrateReward = vi.fn().mockResolvedValue(undefined)

    const result = await runTaskCompletion(3, { completeTask, celebrateReward })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBeInstanceOf(Error)
    expect(celebrateReward).not.toHaveBeenCalled()
  })

  it('never computes or passes any xp/coin value itself — only a type+id ref', async () => {
    const completeTask = vi.fn().mockResolvedValue(undefined)
    const celebrateReward = vi.fn().mockResolvedValue(undefined)

    await runTaskCompletion(99, { completeTask, celebrateReward })

    const [ref] = celebrateReward.mock.calls[0] as [Record<string, unknown>]
    expect(Object.keys(ref).sort()).toEqual(['id', 'type'])
  })
})
