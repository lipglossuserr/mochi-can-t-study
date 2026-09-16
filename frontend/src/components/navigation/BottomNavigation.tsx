import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '@/config/navigation'

/**
 * BottomNavigation
 *
 * Mobile navigation for Mochi's home — the same NAV_ITEMS as Sidebar,
 * laid out as a fixed bottom bar. Visible below the `lg` breakpoint.
 */
function BottomNavigation() {
  return (
    <nav
      aria-label="Rooms"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/50 bg-white/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2.5 font-body text-[11px] font-semibold transition-colors ${
              isActive ? 'text-taro' : 'text-ink/50'
            }`
          }
        >
          <span className="text-lg leading-none" aria-hidden="true">
            {item.emoji}
          </span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export default BottomNavigation
