import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { NAV_ITEMS } from '@/config/navigation'

/**
 * BottomNavigation
 *
 * Mobile navigation for Mochi's home — the same NAV_ITEMS as Sidebar,
 * laid out as a fixed bottom bar. Visible below the `lg` breakpoint.
 * The active tab gets a soft floating pill behind its icon that
 * glides between tabs (via a shared layoutId) rather than just
 * swapping color, and every tab gives a little tap-down feedback.
 */
function BottomNavigation() {
  const location = useLocation()

  return (
    <nav
      aria-label="Rooms"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/50 bg-white/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = location.pathname.startsWith(item.to)
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 font-body text-[11px] font-semibold transition-colors active:scale-90 ${
              isActive ? 'text-taro' : 'text-ink/50'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="bottom-nav-active-pill"
                className="absolute top-0.5 h-8 w-12 rounded-2xl bg-taro-light/60"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative text-lg leading-none transition-transform duration-150 group-active:scale-90" aria-hidden="true">
              {item.emoji}
            </span>
            <span className="relative">{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

export default BottomNavigation
