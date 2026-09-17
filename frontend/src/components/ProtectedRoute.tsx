import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { currentUser, loading } = useAuth()
  const location = useLocation()

  // Never flash the login screen while Firebase is still resolving the
  // session on first load.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-taro-light via-blush-light to-cream">
        <p className="font-body text-ink/60">Loading...</p>
      </div>
    )
  }

  if (!currentUser) {
    // Carry the page someone was actually trying to reach (path +
    // query string, e.g. a Study Room invite link's ?room=xyz) through
    // the login detour — see utils/authRedirect.ts for where this gets
    // read back out.
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}

export default ProtectedRoute
