import { motion } from 'framer-motion'
import type { LeaderboardEntry } from '@/features/leaderboard'

const RANK_MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

interface LeaderboardCardProps {
  topEntries: LeaderboardEntry[]
  me: LeaderboardEntry
}

/**
 * Top-10 list plus a pinned "you" row when the caller isn't already in
 * the top 10 — mirrors the backend's own shape (`LeaderboardResponse`
 * always includes `me` separately) instead of re-deriving it here.
 */
function LeaderboardCard({ topEntries, me }: LeaderboardCardProps) {
  const meInTop = topEntries.some((entry) => entry.currentUser)

  return (
    <div className="rounded-[2.5rem] border border-white/50 bg-white/45 p-6 shadow-[0_20px_60px_-15px_rgba(224,112,158,0.4)] backdrop-blur-xl sm:p-8">
      <h2 className="font-display text-lg font-semibold text-ink">🏆 Leaderboard</h2>
      <p className="mt-1 font-body text-sm text-ink/55">Ranked by pet level, XP as tiebreaker</p>

      <ul className="mt-5 space-y-2">
        {topEntries.map((entry) => (
          <LeaderboardRow key={entry.uid} entry={entry} />
        ))}
      </ul>

      {!meInTop && (
        <>
          <div className="my-3 flex items-center gap-2 text-ink/30">
            <div className="h-px flex-1 bg-ink/10" />
            <span className="font-body text-xs">your rank</span>
            <div className="h-px flex-1 bg-ink/10" />
          </div>
          <ul>
            <LeaderboardRow entry={me} />
          </ul>
        </>
      )}
    </div>
  )
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <motion.li
      whileHover={{ x: 3 }}
      className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 transition-shadow ${
        entry.currentUser ? 'bg-taro/15 ring-1 ring-taro/40' : 'bg-white/40 hover:bg-white/60'
      }`}
    >
      <span className="w-7 shrink-0 text-center font-display text-sm font-semibold text-ink/60">
        {RANK_MEDALS[entry.rank] ?? `#${entry.rank}`}
      </span>
      <span className="flex-1 truncate font-body text-sm font-medium text-ink">
        {entry.username}
        {entry.currentUser && <span className="text-ink/40"> (you)</span>}
      </span>
      <span className="shrink-0 font-body text-xs text-ink/50">Lv.{entry.level}</span>
      <span className="shrink-0 font-body text-xs text-ink/40">{entry.xp} xp</span>
    </motion.li>
  )
}

export default LeaderboardCard
