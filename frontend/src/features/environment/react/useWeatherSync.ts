import { useEffect, useRef } from 'react'
import { useEnvironment } from './useEnvironment'
import type { WeatherCondition } from '../types'

/**
 * useWeatherSync — the ONLY place in the app that touches geolocation
 * or fetches weather. Everything else (EnvironmentEngine, AmbientLayer)
 * just reacts to whatever `WeatherCondition` shows up in the snapshot;
 * neither of them knows or cares that Open-Meteo exists.
 *
 * Deliberately opt-in and silent about it: `enabled` starts false
 * everywhere it's used (see `WeatherToggle.tsx`), and this hook NEVER
 * calls `getCurrentPosition` — which is what triggers the browser's
 * permission prompt — until the caller explicitly flips `enabled` to
 * true. There is no "ask on mount" path. If the user never opts in,
 * this hook does nothing for the lifetime of the app, and the room
 * renders exactly as it did before weather sync existed (see
 * EnvironmentEngine's WEATHER_ADJUSTMENT comment for the same
 * guarantee at the lighting-math layer).
 *
 * Uses Open-Meteo's free forecast API — no API key, no account, no
 * request limit that ordinary personal use would ever hit. A single
 * `current=weather_code` field is all this needs.
 */

const REFRESH_INTERVAL_MS = 30 * 60_000 // weather doesn't need to be fresher than this
const FETCH_TIMEOUT_MS = 8_000

/**
 * Open-Meteo's WMO weather codes, collapsed down to the six coarse
 * buckets `EnvironmentEngine` knows about. Codes not listed fall back
 * to 'clear' via the default case below — deliberately the least
 * dramatic bucket for anything unrecognized, never 'unknown' (which
 * would look, visually, exactly like turning weather sync back off).
 */
function bucketFromWmoCode(code: number): WeatherCondition {
    if (code === 0 || code === 1) return 'clear'
    if (code === 2 || code === 3 || (code >= 45 && code <= 48)) return 'cloudy'
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rainy'
    if (code >= 71 && code <= 77) return 'snowy'
    if (code >= 85 && code <= 86) return 'snowy'
    if (code >= 95 && code <= 99) return 'stormy'
    return 'clear'
}

async function fetchWeather(latitude: number, longitude: number): Promise<WeatherCondition | null> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=weather_code`
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) return null
        const data = (await response.json()) as { current?: { weather_code?: number } }
        const code = data.current?.weather_code
        return typeof code === 'number' ? bucketFromWmoCode(code) : null
    } catch {
        // Offline, blocked by an extension, CORS hiccup, Open-Meteo
        // having a bad day — any of these just mean weather quietly
        // stays whatever it last was (or 'unknown'). Never surfaced as
        // an error to the user; this is pure ambience, not a feature
        // anyone is depending on.
        return null
    } finally {
        clearTimeout(timeout)
    }
}

export function useWeatherSync(enabled: boolean): void {
    const { actions } = useEnvironment()
    const actionsRef = useRef(actions)
    actionsRef.current = actions

    useEffect(() => {
        if (!enabled) return
        if (typeof navigator === 'undefined' || !navigator.geolocation) return

        let cancelled = false

        const sync = () => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (cancelled) return
                    void fetchWeather(position.coords.latitude, position.coords.longitude).then((weather) => {
                        if (!cancelled && weather) actionsRef.current.setWeather(weather)
                    })
                },
                () => {
                    // Permission denied or position unavailable — leave
                    // weather at whatever it already was (typically
                    // 'unknown', its permanent no-op default) rather
                    // than retrying and re-prompting.
                },
                { maximumAge: REFRESH_INTERVAL_MS, timeout: FETCH_TIMEOUT_MS },
            )
        }

        sync()
        const intervalId = setInterval(sync, REFRESH_INTERVAL_MS)

        return () => {
            cancelled = true
            if (intervalId) clearInterval(intervalId)
        }
    }, [enabled])
}
