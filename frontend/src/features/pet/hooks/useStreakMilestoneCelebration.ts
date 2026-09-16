import { useEffect, useState } from 'react'
import { characterEvents } from '@/features/character'
import { confettiEvents } from '@/features/confetti/confettiEventBus'

const MILESTONES = [7, 14, 30, 50, 100, 200, 365]
const STORAGE_KEY_PREFIX = 'mochi:celebrated-streak-milestones'
const CONFETTI_EMOJIS = ['🔥', '🎉', '✨', '⭐']

function readCelebrated(uid: string): number[] {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}:${uid}`)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'number') : []
  } catch {
    // Storage unavailable or corrupted — fail open to "nothing
    // celebrated yet" rather than throwing; worst case a milestone
    // gets celebrated again, which is harmless.
    return []
  }
}

function markCelebrated(uid: string, milestone: number, existing: number[]): void {
  try {
    window.localStorage.setItem(`${STORAGE_KEY_PREFIX}:${uid}`, JSON.stringify([...existing, milestone]))
  } catch {
    // Not persisting just means this milestone might celebrate again
    // on a future visit — never worth failing loudly over.
  }
}

/**
 * useStreakMilestoneCelebration
 *
 * One confetti burst + banner the FIRST time `currentStreak` reaches
 * each value in MILESTONES, persisted in localStorage — keyed by
 * `uid`, not just a flat key, since this app is account-based and a
 * shared device (family computer, a developer switching test
 * accounts) genuinely can have more than one Mochi account signed in
 * over time; an unscoped key would silently suppress a second
 * account's real, first-time milestone because a *different* account
 * already celebrated that same number. Still a client-side/per-browser
 * mechanism rather than a backend field — this is a cosmetic
 * celebration, not game state, so "per browser, per account" is a
 * reasonable and proportionate scope, not a full server-side fix.
 *
 * `uid` may be null/undefined transiently (e.g. auth still resolving)
 * — the hook simply no-ops until it has one, rather than celebrating
 * under a shared/anonymous key that a real uid would later collide with.
 *
 * Returns the milestone number currently being celebrated (for a
 * banner to display) or null — the caller owns how/whether to render
 * that, this hook only owns the "should this fire, and only once"
 * logic plus the actual confetti/character-reaction side effects.
 */
export function useStreakMilestoneCelebration(
  currentStreak: number,
  uid: string | null | undefined,
): {
  celebratingMilestone: number | null
  dismiss: () => void
} {
  const [celebratingMilestone, setCelebratingMilestone] = useState<number | null>(null)

  useEffect(() => {
    if (!uid) return
    if (!MILESTONES.includes(currentStreak)) return
    const celebrated = readCelebrated(uid)
    if (celebrated.includes(currentStreak)) return

    markCelebrated(uid, currentStreak, celebrated)
    setCelebratingMilestone(currentStreak)
    confettiEvents.emit({ emojis: CONFETTI_EMOJIS, count: 32 })
    characterEvents.emit({ type: 'streak-milestone-reached', streak: currentStreak })
  }, [currentStreak, uid])

  return { celebratingMilestone, dismiss: () => setCelebratingMilestone(null) }
}
