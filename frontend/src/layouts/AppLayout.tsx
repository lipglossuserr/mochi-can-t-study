import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/navigation/Sidebar'
import BottomNavigation from '@/components/navigation/BottomNavigation'
import TopBar from '@/components/navigation/TopBar'
import GlobalPetLayer from '@/features/pet/components/GlobalPetLayer'
import GlobalConfettiLayer from '@/features/confetti/GlobalConfettiLayer'
import KonamiEasterEgg from '@/features/confetti/KonamiEasterEgg'
import { ErrorBoundary } from '@/components/ErrorBoundary'

/**
 * AppLayout
 *
 * The permanent shell every room renders inside:
 *   Sidebar (desktop) | BottomNavigation (mobile) | MainContent | Global Pet Layer
 *
 * PetProvider wraps the whole app above the router (see App.tsx), so
 * the pet is already loaded once and simply persists as rooms swap
 * via <Outlet /> here — no room re-fetches it.
 *
 * Adding a future room (Bedroom, Kitchen, Garden, Community...) means
 * one entry in src/config/navigation.ts and one <Route>; this shell
 * itself never needs to change.
 *
 * Error handling: <Outlet /> is wrapped with a page-level ErrorBoundary
 * so a crash in any room component shows the recovery card while keeping
 * the nav shell (sidebar, topbar, GlobalPetLayer) fully functional.
 */
/**
 * Soft, blurred light blobs drifting slowly behind the whole shell.
 * Purely decorative (aria-hidden, pointer-events-none, fixed so it
 * never affects scroll/layout) — gives every room a dreamier, less
 * flat backdrop than the plain gradient alone. Respects
 * prefers-reduced-motion via the .ambient-blob-* animation classes.
 */
function AmbientBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="ambient-blob-a absolute -left-24 -top-24 h-80 w-80 rounded-full bg-blush/40 blur-3xl sm:h-[26rem] sm:w-[26rem]" />
      <div className="ambient-blob-b absolute -right-20 top-1/4 h-72 w-72 rounded-full bg-taro-light/50 blur-3xl sm:h-96 sm:w-96" />
      <div className="ambient-blob-c absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-butter/50 blur-3xl sm:h-96 sm:w-96" />
    </div>
  )
}

function AppLayout() {
  return (
    <div className="relative flex min-h-screen bg-gradient-to-br from-taro-light via-blush-light to-cream">
      <AmbientBackdrop />
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:pb-10 lg:pt-10">
          {/*
            No max-width here on purpose: rooms have different natural
            widths (Home is a narrow single column of cards; Study
            Room goes wider for its side-by-side timer + webcam), so
            each page owns its own `mx-auto max-w-*` wrapper below.
          */}
          <TopBar />
          {/*
            Page-level boundary: catches render errors inside any room
            without unmounting the nav shell. The reset() callback in
            ErrorBoundary clears the error in place, letting the user
            retry without a full navigation.
          */}
          <ErrorBoundary name="PageContent">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <BottomNavigation />
      <GlobalPetLayer />
      <GlobalConfettiLayer />
      <KonamiEasterEgg />
    </div>
  )
}

export default AppLayout
