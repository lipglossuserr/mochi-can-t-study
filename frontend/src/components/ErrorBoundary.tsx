import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  /**
   * Custom fallback renderer. When omitted the default recovery card is shown.
   * Receives the caught error and a `reset` callback that unmounts the fallback
   * and remounts the children — use it for a "Try again" button.
   */
  fallback?: (error: Error, reset: () => void) => ReactNode
  /**
   * Identifier included in the console error for quick triage.
   * e.g. "App", "PageContent", "RoomScene"
   */
  name?: string
}

interface State {
  error: Error | null
}

/**
 * ErrorBoundary
 *
 * A class component (required by React's error-boundary API) that catches
 * render errors in its subtree and shows a recovery UI rather than a
 * blank screen.
 *
 * Two placements used by this app:
 *  1. Root (main.tsx)   — wraps <App/> to catch catastrophic failures before
 *                         the Router or any provider has mounted. Uses
 *                         window.location for navigation — no React Router needed.
 *  2. Page (AppLayout)  — wraps <Outlet/> for page-level errors. Same fallback,
 *                         but reset() clears the error in place so the nav shell
 *                         (sidebar, topbar) stays mounted and usable.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    const label = this.props.name ? `:${this.props.name}` : ''
    console.error(`[ErrorBoundary${label}]`, error, info.componentStack)
  }

  reset = (): void => {
    this.setState({ error: null })
  }

  override render(): ReactNode {
    const { error } = this.state
    if (error) {
      return this.props.fallback
        ? this.props.fallback(error, this.reset)
        : <DefaultErrorCard error={error} reset={this.reset} />
    }
    return this.props.children
  }
}

// ---------------------------------------------------------------------------
// Default recovery card — self-contained, no context dependencies.
// Uses design tokens from globals.css (taro, ink, cream, blush-light).
// ---------------------------------------------------------------------------

interface CardProps {
  error: Error
  reset: () => void
}

function DefaultErrorCard({ error, reset }: CardProps) {
  const isDev = import.meta.env.DEV

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-taro-light via-blush-light to-cream px-6">
      <div className="w-full max-w-md rounded-[2.5rem] border border-white/50 bg-white/45 p-10 text-center shadow-[0_20px_60px_-15px_rgba(224,112,158,0.4)] backdrop-blur-xl">

        {/* Mochi mascot — inline so no import is needed from this class component */}
        <svg
          viewBox="0 0 200 200"
          className="mx-auto mb-6 h-24 w-24 drop-shadow"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="eb-body" cx="35%" cy="28%" r="80%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="55%" stopColor="#FBEFF6" />
              <stop offset="100%" stopColor="#F0D9EA" />
            </radialGradient>
          </defs>
          <ellipse cx="100" cy="38" rx="15" ry="13" fill="url(#eb-body)" />
          <ellipse cx="100" cy="114" rx="86" ry="76" fill="url(#eb-body)" />
          <ellipse cx="57" cy="122" rx="13" ry="8.5" fill="#F0A8BE" opacity="0.7" />
          <ellipse cx="143" cy="122" rx="13" ry="8.5" fill="#F0A8BE" opacity="0.7" />
          {/* worried eyes — slightly narrower arcs */}
          <path d="M69 102 Q76 97 83 102" stroke="#382C3E" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M117 102 Q124 97 131 102" stroke="#382C3E" strokeWidth="3" strokeLinecap="round" fill="none" />
          {/* small worried mouth */}
          <path d="M88 128 Q100 122 112 128" stroke="#382C3E" strokeWidth="3" strokeLinecap="round" fill="none" />
        </svg>

        <h2 className="font-display text-xl font-semibold text-ink">
          Something went wrong
        </h2>
        <p className="mt-2 font-body text-sm leading-relaxed text-ink/60">
          Mochi ran into an unexpected problem. You can try again or go back home.
        </p>

        {/* Error detail — development only */}
        {isDev && (
          <pre className="mt-4 max-h-32 overflow-auto rounded-2xl bg-ink/5 px-4 py-3 text-left font-mono text-[11px] leading-relaxed text-berry">
            {error.message}
          </pre>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-taro px-6 py-2.5 font-body text-sm font-semibold text-white shadow-md shadow-taro/30 transition-colors hover:bg-taro-dark"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => { window.location.href = '/' }}
            className="rounded-full border border-taro/30 bg-white/60 px-6 py-2.5 font-body text-sm font-semibold text-taro transition-colors hover:bg-white/80"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  )
}
