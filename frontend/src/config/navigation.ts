export interface NavItem {
  to: string
  label: string
  emoji: string
  /** Rooms without real content yet render a "Coming Soon" placeholder. */
  comingSoon?: boolean
}

/**
 * Every room in Mochi's home, in nav order. Both the desktop Sidebar
 * and the mobile BottomNavigation render from this single list, and
 * AppRouter maps each `to` to a page — so adding a future room
 * (Bedroom, Kitchen, Garden, Community...) is a one-line addition
 * here plus one route, with no changes to the shell itself.
 */
export const NAV_ITEMS: NavItem[] = [
  { to: '/home', label: 'Home', emoji: '🏠' },
  { to: '/study-room', label: 'Study Room', emoji: '📚' },
  { to: '/tasks', label: 'Tasks', emoji: '📝' },
  { to: '/daily-goals', label: 'Daily Goals', emoji: '🎯' },
  { to: '/flashcards', label: 'Flashcards', emoji: '🃏' },
  { to: '/study-with-others', label: 'Study with Others', emoji: '👥' },
  { to: '/community', label: 'Community', emoji: '🌸' },
  { to: '/shop', label: 'Shop', emoji: '🛒' },
  { to: '/profile', label: 'Profile', emoji: '👤' },
]
