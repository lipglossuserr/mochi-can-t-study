import { NavLink } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { NAV_ITEMS } from '@/config/navigation'

/**
 * Sidebar
 *
 * Desktop navigation for Mochi's home — one entry per room, driven
 * entirely by NAV_ITEMS so new rooms never require shell changes.
 * Hidden below the `lg` breakpoint in favor of BottomNavigation.
 */
function Sidebar() {
  const { logout } = useAuth()

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/50 bg-white/40 px-5 py-8 backdrop-blur-xl lg:flex">
      <div className="flex items-center gap-2 px-2">
        <span className="text-2xl" aria-hidden="true">
          🍡
        </span>
        <span className="font-display text-lg font-semibold text-ink">Mochi</span>
      </div>

      <nav className="mt-10 flex flex-1 flex-col gap-1.5" aria-label="Rooms">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-2xl px-4 py-3 font-body text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                isActive
                  ? 'bg-taro text-white shadow-lg shadow-taro/30'
                  : 'text-ink/70 hover:bg-blush-light/70'
              }`
            }
          >
            <span className="text-lg transition-transform duration-200 group-hover:scale-110" aria-hidden="true">
              {item.emoji}
            </span>
            {item.label}
            {item.comingSoon && (
              <span className="ml-auto rounded-full bg-white/70 px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wide text-taro/70">
                Soon
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={logout}
        className="mt-4 flex items-center gap-3 rounded-2xl px-4 py-3 text-left font-body text-sm font-semibold text-ink/60 transition-colors hover:bg-blush-light/70 hover:text-berry"
      >
        <span className="text-lg" aria-hidden="true">
          🚪
        </span>
        Logout
      </button>
    </aside>
  )
}

export default Sidebar
