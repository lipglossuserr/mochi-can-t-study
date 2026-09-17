import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/auth/AuthContext'
import { fetchCurrentUser } from '@/services/userService'
import { NAV_ITEMS } from '@/config/navigation'

/**
 * TopBar
 *
 * Sits above MainContent on every room, on every breakpoint (Sidebar's
 * logout is desktop-only, so this is what gives mobile a way to log
 * out without adding a sixth bottom-nav icon). Shows which room the
 * person is in and a light personal greeting.
 *
 * Fetches the profile once — this lives inside AppLayout, which stays
 * mounted while rooms swap via Outlet, so switching rooms never
 * re-fetches it.
 */
function TopBar() {
  const { logout } = useAuth()
  const location = useLocation()
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchCurrentUser()
      .then((response) => {
        if (!cancelled) setUsername(response.data.data.username)
      })
      .catch(() => {
        // Silent — a missing greeting isn't worth a blocking error here.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const currentRoom = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to))

  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-1 pb-6">
      <div>
        <AnimatePresence mode="wait">
          <motion.h1
            key={currentRoom?.to ?? 'mochi'}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="font-display text-xl font-semibold text-ink sm:text-2xl"
          >
            {currentRoom ? `${currentRoom.emoji} ${currentRoom.label}` : 'Mochi'}
          </motion.h1>
        </AnimatePresence>
        {username && (
          <p className="mt-0.5 font-body text-sm text-ink/50">Welcome back, {username} ♡</p>
        )}
      </div>

      <motion.button
        type="button"
        onClick={logout}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Logout"
        className="shrink-0 rounded-full bg-white/70 px-4 py-2 font-body text-sm font-semibold text-taro shadow transition-colors hover:bg-blush-light lg:hidden"
      >
        Logout
      </motion.button>
    </header>
  )
}

export default TopBar
