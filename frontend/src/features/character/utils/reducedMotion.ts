/**
 * One shared answer to "should we animate?". CSS handles its own side
 * via @media (prefers-reduced-motion); this is for the JS-driven parts
 * (gaze tracking, particles, idle scheduling).
 *
 * Sprint 6.7: this is called on essentially every ProceduralLayer render
 * (plus the cursor/petting hooks), so the MediaQueryList is created once
 * and cached — `.matches` is a cheap property read that still reflects
 * the OS setting live, `window.matchMedia(query)` re-parsing the query
 * string on every call was the part worth avoiding.
 */
let cachedQuery: MediaQueryList | null = null

export function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    if (!cachedQuery) {
        cachedQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    }
    return cachedQuery.matches
}