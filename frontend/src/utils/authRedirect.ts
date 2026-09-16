import type { Location } from 'react-router-dom'

/**
 * Where to send someone after they finish logging in or registering.
 * Used so a link into a protected route (e.g. a Study Room invite link
 * shared in the app's Community feature — `/study-with-others?room=xyz`)
 * survives a logged-out visitor's detour through /login or /register,
 * instead of always dumping them on /home regardless of what they were
 * actually trying to reach.
 *
 * Deliberately only accepts a same-app relative path (must start with
 * a single `/`, never `//` which browsers can treat as protocol-relative
 * to another host) — `location.state` is React Router's own in-memory
 * navigation state, not attacker-controllable from a URL, but there's
 * no reason to trust it any further than that anyway.
 */
export function getPostAuthRedirectPath(location: Location): string {
  const from = (location.state as { from?: Location } | null)?.from
  if (from && typeof from.pathname === 'string' && from.pathname.startsWith('/') && !from.pathname.startsWith('//')) {
    return `${from.pathname}${from.search ?? ''}`
  }
  return '/home'
}
