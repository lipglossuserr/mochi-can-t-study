import { formatDuration } from '@/utils/timeFormat'
import type { SessionStatus } from '@/types/studySession'

/**
 * The page's signature element: a celestial progress ring. The remaining
 * time sits inside a rose-gold ring that empties as the session runs,
 * ringed by tiny twinkling stars — a nod to the dreamy card frames of
 * the app's visual references.
 */
function SessionProgress({
  remainingSeconds,
  plannedSeconds,
  status,
}: {
  remainingSeconds: number
  plannedSeconds: number
  status: SessionStatus
}) {
  const radius = 118
  const circumference = 2 * Math.PI * radius
  const fractionLeft =
    plannedSeconds > 0 ? Math.min(1, Math.max(0, remainingSeconds / plannedSeconds)) : 0

  const stars = [0, 45, 90, 135, 180, 225, 270, 315]

  return (
    <div className="relative mx-auto h-72 w-72">
      <svg viewBox="0 0 280 280" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e0709e" />
            <stop offset="60%" stopColor="#d68ba6" />
            <stop offset="100%" stopColor="#f2a0bd" />
          </linearGradient>
        </defs>
        <circle
          cx="140"
          cy="140"
          r={radius}
          fill="none"
          stroke="#fbd9e6"
          strokeWidth="12"
        />
        <circle
          cx="140"
          cy="140"
          r={radius}
          fill="none"
          stroke="url(#ringGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fractionLeft)}
          style={{ transition: 'stroke-dashoffset 0.4s linear' }}
        />
      </svg>

      {/* twinkling stars orbiting the ring */}
      {stars.map((angle, index) => {
        const rad = (angle * Math.PI) / 180
        const x = 50 + 50 * Math.cos(rad)
        const y = 50 + 50 * Math.sin(rad)
        return (
          <span
            key={angle}
            aria-hidden="true"
            className="sparkle absolute text-xs text-rosegold"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              animationDelay: `${index * 0.33}s`,
            }}
          >
            ✦
          </span>
        )
      })}

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p
          className="font-display text-5xl font-semibold tabular-nums text-ink"
          role="timer"
          aria-live="polite"
        >
          {formatDuration(remainingSeconds)}
        </p>
        <p className="mt-2 font-body text-xs font-semibold uppercase tracking-widest text-taro">
          {status === 'RUNNING' ? 'studying ♡' : status.toLowerCase()}
        </p>
        <p className="mt-1 font-body text-xs text-ink/50">
          of {formatDuration(plannedSeconds)}
        </p>
      </div>
    </div>
  )
}

export default SessionProgress
