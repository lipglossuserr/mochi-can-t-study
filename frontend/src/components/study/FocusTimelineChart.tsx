import { useEffect, useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fetchFocusTimeline } from '@/services/studySessionService'
import type { FocusTimelinePoint } from '@/types/studySession'

/**
 * The focus dip/recover graph for a completed session — every reported
 * ~15s focus batch is already persisted server-side (FocusBatch), so
 * this is purely a read + reshape, no new tracking logic. Renders
 * nothing (not even a loading state) while sessionId is null, and
 * quietly does nothing on fetch failure rather than showing an error —
 * this is a nice-to-have insight panel, not something that should ever
 * block or clutter the session summary it lives inside.
 */
function FocusTimelineChart({ sessionId }: { sessionId: number }) {
  const [points, setPoints] = useState<FocusTimelinePoint[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchFocusTimeline(sessionId)
      .then((res) => {
        if (!cancelled) setPoints(res.data.data)
      })
      .catch(() => {
        if (!cancelled) setPoints([])
      })
    return () => {
      cancelled = true
    }
  }, [sessionId])

  if (points == null) {
    return (
      <div className="mt-4 flex h-32 items-center justify-center rounded-2xl bg-white/40">
        <p className="font-body text-xs text-ink/40">Loading focus timeline…</p>
      </div>
    )
  }

  // Batches with nothing monitored (a gap, or the window landed entirely
  // in e.g. camera-unavailable time) report focusScore: null — recharts
  // renders a null point as a break in the line, which is the honest
  // thing to show (we don't know what focus looked like there) rather
  // than interpolating or defaulting to 0.
  const chartData = points.map((point, index) => ({
    index,
    time: new Date(point.windowStartedAt).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    }),
    focusScore: point.focusScore == null ? null : Math.round(point.focusScore),
  }))

  if (chartData.length < 2) {
    return (
      <div className="mt-4 rounded-2xl bg-white/40 p-4 text-center">
        <p className="font-body text-xs text-ink/50">
          Not enough data yet for a timeline — this fills in as you study longer.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-4">
      <h3 className="font-body text-xs font-semibold uppercase tracking-widest text-ink/50">
        Focus over time
      </h3>
      <div className="mt-2 h-40 w-full rounded-2xl bg-white/40 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="focusFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-matcha)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--color-matcha)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: 'var(--color-ink)', opacity: 0.4 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: 'var(--color-ink)', opacity: 0.4 }}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <Tooltip
              formatter={(value) => [typeof value === 'number' ? `${value}%` : '—', 'Focus']}
              labelFormatter={(label) => label}
              contentStyle={{
                borderRadius: '0.75rem',
                border: '1px solid rgba(224,112,158,0.2)',
                fontSize: '0.75rem',
              }}
            />
            <Area
              type="monotone"
              dataKey="focusScore"
              stroke="var(--color-matcha)"
              strokeWidth={2}
              fill="url(#focusFill)"
              connectNulls={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default FocusTimelineChart
