import { motion } from 'framer-motion'
import type { UserProfile } from '@/types/auth'
import { formatTaskDate } from '@/features/tasks/utils/formatTaskDate'

interface ProfileHeaderProps {
  profile: UserProfile
  provider: string
  onLogout: () => void
}

/**
 * The identity card at the top of the Profile page: a monogram avatar
 * (no photo upload exists yet, so this is the honest default rather
 * than a placeholder image), username/email pulled from the backend
 * profile — never from the Firebase user object directly, so this
 * always matches what `/api/users/me` actually has on record — the
 * sign-in method, read straight off the Firebase user's own provider
 * data, and how long they've been with Mochi, reusing the same date
 * formatter tasks/goals already use so "Jul 18, 2026" reads the same
 * everywhere in the app.
 */
function ProfileHeader({ profile, provider, onLogout }: ProfileHeaderProps) {
  const initial = profile.username?.trim()?.[0]?.toUpperCase() ?? '?'
  const joinedLabel = formatTaskDate(profile.createdAt)

  return (
    <div className="rounded-[2.5rem] border border-white/50 bg-white/45 p-8 text-center shadow-[0_20px_60px_-15px_rgba(224,112,158,0.4)] backdrop-blur-xl sm:p-10">
      <motion.div
        whileHover={{ scale: 1.08, rotate: [0, -4, 4, 0] }}
        transition={{ duration: 0.4 }}
        className="mx-auto flex h-20 w-20 cursor-default items-center justify-center rounded-full bg-gradient-to-br from-taro to-blush font-display text-3xl font-semibold text-white shadow-lg shadow-taro/30"
      >
        {initial}
      </motion.div>

      <h1 className="mt-4 font-display text-2xl font-semibold text-ink">
        {profile.username} ♡
      </h1>
      <p className="mt-1 font-body text-sm text-ink/70">{profile.email}</p>
      <p className="mt-1 font-body text-xs text-ink/45">Signed in with {provider}</p>
      {joinedLabel && (
        <p className="mt-1 font-body text-xs text-ink/40">🍡 Studying with Mochi since {joinedLabel}</p>
      )}

      <motion.button
        type="button"
        onClick={onLogout}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="glow-hover mt-6 rounded-full bg-white/70 px-6 py-2.5 font-body text-sm font-semibold text-taro shadow transition-colors hover:bg-blush-light"
      >
        Logout
      </motion.button>
    </div>
  )
}

export default ProfileHeader
