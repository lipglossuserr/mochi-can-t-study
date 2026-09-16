import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEnvironment, useWeatherSync } from '@/features/environment'
import type { WeatherCondition } from '@/features/environment'

const STORAGE_KEY = 'mochi:weather-enabled'

const WEATHER_EMOJI: Record<WeatherCondition, string> = {
  unknown: '🌦️',
  clear: '☀️',
  cloudy: '☁️',
  rainy: '🌧️',
  stormy: '⛈️',
  snowy: '❄️',
}

function readStoredPreference(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    // Storage unavailable (private browsing, quota) — fail open to
    // "off", same fail-open direction rewardPipeline.ts's own
    // localStorage reads use, and the safer default for something
    // that triggers a location permission prompt.
    return false
  }
}

function writeStoredPreference(enabled: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(enabled))
  } catch {
    // Worst case the toggle doesn't persist across a reload — never
    // worth failing loudly over.
  }
}

/**
 * WeatherToggle
 *
 * The one and only UI control for opting into weather-reactive
 * ambience. Defaults OFF for a first-time visitor and stays off until
 * explicitly turned on — `useWeatherSync` never requests geolocation
 * permission on its own (see that hook's header comment), so this
 * toggle is the only path that can trigger the browser's location
 * prompt, and only on an explicit click, never on page load.
 *
 * Deliberately small and easy to miss rather than a prominent banner —
 * this is a nice-to-have ambience layer, not a feature the app should
 * pressure anyone into enabling.
 */
function WeatherToggle() {
  const [enabled, setEnabled] = useState(readStoredPreference)
  useWeatherSync(enabled)
  // Once enabled, reflect the ACTUAL resolved weather (not just a
  // generic "on" icon) — 'unknown' until the first successful fetch,
  // same fallback the engine itself treats as a no-op elsewhere.
  const { weather } = useEnvironment()
  const displayedWeather: WeatherCondition = enabled ? weather : 'unknown'

  const toggle = () => {
    const next = !enabled
    setEnabled(next)
    writeStoredPreference(next)
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={toggle}
      aria-pressed={enabled}
      title={
        enabled
          ? "Weather ambience is on — the room's light and mood follow your local weather."
          : "Turn on weather ambience — the room's light and mood will follow your local weather (uses your location)."
      }
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-body text-xs font-semibold transition-colors ${
        enabled
          ? 'border-taro/30 bg-taro/15 text-taro-dark'
          : 'border-ink/10 bg-white/60 text-ink/50 hover:bg-white/80'
      }`}
    >
      <span className="relative inline-flex h-4 w-4 items-center justify-center" aria-hidden="true">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={enabled ? displayedWeather : 'off'}
            initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {enabled ? WEATHER_EMOJI[displayedWeather] : '☀️'}
          </motion.span>
        </AnimatePresence>
      </span>
      {enabled ? 'Weather on' : 'Weather off'}
    </motion.button>
  )
}

export default WeatherToggle
