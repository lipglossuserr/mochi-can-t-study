import type { Pet } from '../types/pet'

/**
 * rewardPipeline — Sprint 7.1A.
 *
 * The one place that turns "the pet's stats before vs. after some
 * server-side event" into a celebration, and the one place that
 * remembers which of those events has already been celebrated so it's
 * never shown twice. Built for the Study Room's post-session reward,
 * but deliberately source-agnostic: nothing in this file knows what a
 * "study session" is. See `RewardSourceType` below for how Tasks,
 * Achievements, and Daily Goals plug into the exact same pipeline
 * later — they call `usePet().celebrateReward({ type, id })` with their
 * own source type/id and reuse every line of this file as-is.
 *
 * Server-authoritative, always: this module never invents or adjusts
 * XP/coins/level itself — `computeRewardDiff` only *compares* two Pet
 * snapshots the server already returned (one from before the awarding
 * action, one from a fresh GET /pet after it). The backend remains the
 * single source of truth for every number that appears on screen; nothing
 * here computes a reward, only reports one that already happened.
 * Confirmed directly against the backend source
 * (`RewardService.java`/`StudySessionService.java`): a study session can
 * only ever be rewarded once server-side — `complete()` is idempotent
 * and only invokes `RewardService` on the single real transition into
 * COMPLETED, and an early `stop()` never grants a reward at all. This
 * module's own dedup below is purely a client-side *display* guard on
 * top of that already-solid server guarantee, not a substitute for it.
 *
 * Streaks: `computeRewardDiff` diffs `currentStreak` the same way as
 * xp/coins — a server-returned `Pet.currentStreak`/`longestStreak` pair
 * (confirmed against `Pet.java`/`RewardService.java`: `updateStreak`
 * increments on a new calendar day, no-ops same-day, resets to 1 on a
 * gap). `streakGained` is a boolean rather than a numeric delta,
 * because unlike xp/coins (which can jump by any amount in one
 * completion), a streak can only ever go up by exactly one day per
 * completion — the interesting fact to celebrate is "did today extend
 * it", not "by how much".
 */

/**
 * What kind of thing produced a reward. Only `'study-session'` is wired
 * to a real call site today (PetContext's `celebrateStudyReward`) — the
 * other three exist now specifically so a future Tasks/Achievements/
 * Daily Goals feature has a type to add itself to instead of inventing
 * a parallel celebration mechanism.
 */
export type RewardSourceType = 'study-session' | 'task' | 'achievement' | 'daily-goal' | 'flashcard-deck'

/** Identifies exactly one reward-worthy event — e.g. one specific completed study session. */
export interface RewardSourceRef {
    type: RewardSourceType
    id: string | number
}

function refKey(ref: RewardSourceRef): string {
    return `${ref.type}:${ref.id}`
}

export interface RewardDiff {
    xpGained: number
    coinsGained: number
    leveledUp: boolean
    /** True when this completion pushed currentStreak up by one (a new calendar day studied). Never true on a same-day repeat completion — see updateStreak's no-op case. */
    streakGained: boolean
    /** after.currentStreak, always — shown regardless of streakGained so the celebration can say "3-day streak" even when e.g. only xp/coins changed on a same-day repeat. */
    newStreak: number
}

/**
 * Compare two server-returned Pet snapshots and report what changed.
 * Pure — no side effects, no network, no storage.
 *
 * `xp` is a cumulative lifetime total that never resets on level-up
 * (confirmed against `RewardService.java` — `pet.setXp(pet.getXp() +
 * xpGained)`), so the gain is always a plain subtraction, level-up
 * included — no special-casing needed there, unlike an earlier version
 * of this function written before the backend source was available.
 */
export function computeRewardDiff(before: Pet, after: Pet): RewardDiff {
    return {
        xpGained: Math.max(0, after.xp - before.xp),
        coinsGained: Math.max(0, after.coins - before.coins),
        leveledUp: after.level > before.level,
        streakGained: after.currentStreak > before.currentStreak,
        newStreak: after.currentStreak,
    }
}

export function isRewardDiffMeaningful(diff: RewardDiff): boolean {
    return diff.xpGained > 0 || diff.coinsGained > 0 || diff.leveledUp || diff.streakGained
}

// ---------------------------------------------------------------------
// Idempotency: "has this exact reward-worthy event already been shown?"
// ---------------------------------------------------------------------

/**
 * Sprint 7.1A — prevents the celebration UI (and Mochi's celebrate()
 * reaction) from firing twice for the same event across a refresh or
 * an away-and-back navigation, where an in-memory `useRef` guard alone
 * resets right along with the component that held it. Backed by
 * `localStorage` specifically so it survives a full page reload, not
 * just a re-render.
 *
 * This only gates the CLIENT-SIDE celebration display — it has no
 * bearing on the server's own idempotency for applying a reward (that's
 * the backend's responsibility entirely; this module never applies a
 * reward, only reports on one). Even if this guard is somehow bypassed
 * (private browsing, storage cleared mid-session), `computeRewardDiff`
 * naturally shows nothing new the second time a genuinely-unchanged
 * pet snapshot is diffed — this is a fast, no-flicker-first-render
 * belt to that already-existing suspenders, not the only thing
 * standing between a user and a duplicate-looking celebration.
 */
const STORAGE_KEY = 'mochi:celebrated-rewards'
/** Cap so this can never grow unbounded across a long-lived browser profile. */
const MAX_TRACKED = 100

function readCelebrated(): string[] {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        const parsed: unknown = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : []
    } catch {
        // Storage unavailable/corrupt (private browsing, quota, bad JSON from
        // a future format change) — fail open to "nothing recorded yet"
        // rather than let a storage hiccup break the reward screen.
        return []
    }
}

function writeCelebrated(keys: string[]): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(keys.slice(-MAX_TRACKED)))
    } catch {
        // Same fail-open reasoning as readCelebrated — worst case, this one
        // event's dedup entry doesn't persist, which only risks re-showing
        // a celebration for it once, never a crash.
    }
}

/** Has this exact reward-worthy event already had its celebration shown? */
export function hasCelebrated(ref: RewardSourceRef): boolean {
    return readCelebrated().includes(refKey(ref))
}

/** Record that this event's celebration has now been shown. */
export function markCelebrated(ref: RewardSourceRef): void {
    const key = refKey(ref)
    const current = readCelebrated()
    if (current.includes(key)) return
    writeCelebrated([...current, key])
}
