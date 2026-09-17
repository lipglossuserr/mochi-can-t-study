import { motion } from 'framer-motion'
import type { Achievement } from '@/features/achievements'

interface AchievementGridProps {
  achievements: Achievement[]
}

/**
 * Grid of every achievement in the catalog, unlocked ones in full
 * color and locked ones dimmed/grayscale — the full set is always
 * shown (never just the unlocked ones) so a person can see what's
 * still ahead of them, same idea as a trophy case.
 */
function AchievementGrid({ achievements }: AchievementGridProps) {
  const unlockedCount = achievements.filter((a) => a.unlocked).length

  return (
    <div className="rounded-[2.5rem] border border-white/50 bg-white/45 p-6 shadow-[0_20px_60px_-15px_rgba(224,112,158,0.4)] backdrop-blur-xl sm:p-8">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">🎖️ Achievements</h2>
        <span className="font-body text-sm text-ink/50">
          {unlockedCount}/{achievements.length}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {achievements.map((achievement) => (
          <motion.div
            key={achievement.key}
            title={achievement.description}
            whileHover={achievement.unlocked ? { y: -3, scale: 1.03 } : undefined}
            className={`rounded-[1.5rem] border p-4 text-center transition-opacity ${
              achievement.unlocked
                ? 'glow-hover cursor-default border-white/60 bg-white/50'
                : 'border-white/30 bg-white/20 opacity-45 grayscale'
            }`}
          >
            <motion.p
              className="text-2xl"
              aria-hidden="true"
              whileHover={achievement.unlocked ? { rotate: [0, -10, 10, 0], scale: 1.15 } : undefined}
              transition={{ duration: 0.4 }}
            >
              {achievement.emoji}
            </motion.p>
            <p className="mt-1.5 font-display text-xs font-semibold text-ink/75">
              {achievement.title}
            </p>
            <p className="mt-0.5 line-clamp-2 font-body text-[11px] text-ink/45">
              {achievement.description}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default AchievementGrid
