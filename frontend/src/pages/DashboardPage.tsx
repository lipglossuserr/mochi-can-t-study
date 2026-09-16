import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/auth/AuthContext'
import { fetchCurrentUser } from '@/services/userService'
import type { UserProfile } from '@/types/auth'
import { getFirebaseErrorMessage } from '@/utils/firebaseErrors'

/**
 * The authenticated home. Now a hub: profile card plus feature tiles,
 * where Study Room is live and the rest are honest "soon" placeholders
 * for later sprints (pet, tasks, shop, analytics...).
 */
const UPCOMING = [
  { emoji: '🐣', label: 'Virtual pet' },
  { emoji: '📝', label: 'Tasks' },
  { emoji: '🛍️', label: 'Shop' },
  { emoji: '📊', label: 'Analytics' },
]

function DashboardPage() {
  const { currentUser, logout } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetchCurrentUser()
        if (!cancelled) setProfile(response.data.data)
      } catch (err) {
        if (!cancelled) setError(getFirebaseErrorMessage(err))
      } finally {
        if (!cancelled) setLoadingProfile(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const provider =
    currentUser?.providerData[0]?.providerId === 'google.com'
      ? 'Google'
      : 'Email & Password'

  return (
    <div className="min-h-screen bg-gradient-to-br from-taro-light via-blush-light to-cream px-6 py-14">
      <div className="mx-auto w-full max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="rounded-[2.5rem] border border-white/50 bg-white/45 p-8 text-center shadow-[0_20px_60px_-15px_rgba(224,112,158,0.4)] backdrop-blur-xl sm:p-10"
        >
          {loadingProfile ? (
            <>
              <h1 className="font-display text-2xl font-semibold text-ink">Welcome,</h1>
              <p className="mt-2 font-body text-ink/60">Loading...</p>
            </>
          ) : error ? (
            <>
              <h1 className="font-display text-2xl font-semibold text-ink">Welcome,</h1>
              <p className="mt-2 rounded-2xl bg-blush/20 px-4 py-2 font-body text-sm text-ink">
                {error}
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-semibold text-ink">
                Welcome, {profile?.username} ♡
              </h1>
              <p className="mt-3 font-body text-sm text-ink/70">{profile?.email}</p>
              <p className="mt-1 font-body text-sm text-ink/50">{provider}</p>
            </>
          )}

          <motion.button
            type="button"
            onClick={logout}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="mt-6 rounded-full bg-white/70 px-6 py-2.5 font-body text-sm font-semibold text-taro shadow transition-colors hover:bg-blush-light"
          >
            Logout
          </motion.button>
        </motion.div>

        {/* Study Room — the live feature tile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          className="mt-6"
        >
          <Link
            to="/study-room"
            className="group block rounded-[2.5rem] border border-white/60 bg-gradient-to-r from-taro to-blush p-8 text-left shadow-[0_20px_60px_-15px_rgba(224,112,158,0.55)] transition-transform hover:scale-[1.015]"
          >
            <p className="font-display text-xs font-semibold uppercase tracking-widest text-white/80">
              ✦ new
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-white">
              Study Room
            </h2>
            <p className="mt-2 max-w-md font-body text-sm text-white/85">
              Start a Pomodoro session with gentle webcam focus tracking, and
              earn a focus score for every study sprint.
            </p>
            <span className="mt-4 inline-block rounded-full bg-white/90 px-5 py-2 font-body text-sm font-semibold text-taro shadow transition-colors group-hover:bg-white">
              Enter the study room →
            </span>
          </Link>
        </motion.div>

        {/* Coming soon tiles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18, ease: 'easeOut' }}
          className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4"
        >
          {UPCOMING.map((feature) => (
            <div
              key={feature.label}
              className="rounded-[1.75rem] border border-white/50 bg-white/40 p-5 text-center backdrop-blur-xl"
            >
              <p className="text-2xl" aria-hidden="true">
                {feature.emoji}
              </p>
              <p className="mt-1.5 font-display text-sm font-semibold text-ink/70">
                {feature.label}
              </p>
              <p className="font-body text-[11px] text-ink/40">soon ♡</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}

export default DashboardPage
