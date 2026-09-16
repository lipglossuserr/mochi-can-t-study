import { focusConfig } from '@/config/focusConfig'

const PRESETS = [5, 15, 25, 50]

/**
 * Duration picker for a new session. The 5-minute minimum is validated
 * here for a friendly message — and again on the backend, which is the
 * one that actually enforces it.
 */
function DurationSelector({
  minutes,
  onChange,
  disabled,
}: {
  minutes: number
  onChange: (minutes: number) => void
  disabled?: boolean
}) {
  const belowMinimum = minutes < focusConfig.MIN_DURATION_MINUTES

  return (
    <div>
      <p className="font-display text-sm font-semibold text-ink/80">
        How long will you study?
      </p>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={disabled}
            onClick={() => onChange(preset)}
            className={`rounded-full px-5 py-2 font-body text-sm font-semibold transition-colors ${
              minutes === preset
                ? 'bg-taro text-white shadow-lg shadow-taro/30'
                : 'bg-white/70 text-ink/70 hover:bg-blush-light'
            }`}
          >
            {preset} min
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        <label htmlFor="custom-minutes" className="font-body text-sm text-ink/60">
          or custom:
        </label>
        <input
          id="custom-minutes"
          type="number"
          min={focusConfig.MIN_DURATION_MINUTES}
          value={minutes}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-24 rounded-full border border-blush-light bg-white/80 px-4 py-2 text-center font-body text-sm text-ink outline-none focus:border-taro focus:ring-2 focus:ring-taro/30"
        />
        <span className="font-body text-sm text-ink/60">minutes</span>
      </div>

      {belowMinimum && (
        <p className="mt-3 rounded-2xl bg-blush/20 px-4 py-2 font-body text-xs text-berry">
          Study sessions need at least {focusConfig.MIN_DURATION_MINUTES} minutes
          — little steps still deserve real time ♡
        </p>
      )}
    </div>
  )
}

export default DurationSelector
