import { useEffect, useMemo, type CSSProperties, type RefObject } from 'react'
import { useEnvironment, useMochiEnvironmentBridge } from '@/features/environment'

interface AmbientLayerProps {
    /** RoomScene's root element — where this layer writes `--env-*` CSS vars. */
    targetRef: RefObject<HTMLDivElement | null>
}

const MOTE_COUNT = 9

/**
 * AmbientLayer
 *
 * The room's quiet atmosphere: drifting dust motes, a soft diagonal
 * light ray from the window, and (Sprint 6.1) a slow drifting-shadow
 * overlay that tracks the window's light angle through the day.
 *
 * This component is also the one place the Environment system's data
 * actually lands in the DOM. It:
 *
 *  1. Reads `useEnvironment()` (time-aware lighting + a combined
 *     motion multiplier).
 *  2. Runs `useMochiEnvironmentBridge()`, which is the seam that
 *     folds "is Mochi sleeping/energetic right now" into that same
 *     motion multiplier — see that hook's own header for why this is
 *     the only place the two systems touch.
 *  3. Writes the result onto `targetRef` (RoomScene's root) as CSS
 *     custom properties in an effect, imperatively — NOT via React
 *     state/props — so a snapshot change never re-renders
 *     `RoomScene`'s whole subtree (Mochi, her nameplate, the speech
 *     bubble). Every sibling layer (`RoomDepthLayer`,
 *     `RoomMiddleLayer`'s curtains, the plant, the rug) simply
 *     reads `var(--env-warmth, …)` etc. in its own styles, inherited
 *     down the DOM tree for free.
 *
 * Dust motes' own opacity is modulated live by `--env-motion` (via a
 * `calc()` in each mote's inline style) so they thin out at night and
 * during calm/sleeping states without needing to regenerate the
 * mote list — their positions/timings are still randomized once per
 * mount exactly as before, so the drift never reads as a loop.
 */
function AmbientLayer({ targetRef }: AmbientLayerProps) {
    const { lighting, motionLevel, reducedMotion, weather } = useEnvironment()
    useMochiEnvironmentBridge()

    useEffect(() => {
        const el = targetRef.current
        if (!el) return
        el.style.setProperty('--env-warmth', lighting.warmth.toFixed(3))
        el.style.setProperty('--env-brightness', lighting.brightness.toFixed(3))
        el.style.setProperty('--env-angle', `${lighting.angleDeg.toFixed(1)}deg`)
        el.style.setProperty('--env-motion', motionLevel.toFixed(3))
    }, [targetRef, lighting.warmth, lighting.brightness, lighting.angleDeg, motionLevel])

    const motes = useMemo(
        () =>
            Array.from({ length: MOTE_COUNT }, (_, index) => ({
                id: index,
                left: 8 + Math.random() * 84,
                top: 12 + Math.random() * 60,
                size: 2 + Math.random() * 2.5,
                duration: 9 + Math.random() * 8,
                delay: -Math.random() * 12, // negative = start mid-drift, no sync
                opacity: 0.18 + Math.random() * 0.22,
            })),
        [],
    )

    // Weather (opt-in — see useWeatherSync.ts). 'unknown'/'clear' render
    // nothing here; the room already looks exactly like "no weather"
    // for both of those, on purpose (see WEATHER_ADJUSTMENT's own
    // comment on the engine side).
    const rainDrops = useMemo(
        () =>
            weather === 'rainy' || weather === 'stormy'
                ? Array.from({ length: weather === 'stormy' ? 26 : 16 }, (_, index) => ({
                      id: index,
                      left: Math.random() * 100,
                      duration: 0.5 + Math.random() * 0.35,
                      delay: -Math.random() * 1.5,
                  }))
                : [],
        [weather],
    )
    const snowflakes = useMemo(
        () =>
            weather === 'snowy'
                ? Array.from({ length: 14 }, (_, index) => ({
                      id: index,
                      left: Math.random() * 100,
                      size: 3 + Math.random() * 3,
                      duration: 8 + Math.random() * 6,
                      delay: -Math.random() * 12,
                      drift: -12 + Math.random() * 24,
                  }))
                : [],
        [weather],
    )

    if (reducedMotion) {
        // Reduced motion still gets the (static) light ray for atmosphere —
        // no drifting dust, no shadow sweep, no rain/snow. Nothing here is essential.
        return (
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                <div className="absolute -left-10 -top-10 h-[70%] w-[45%] rotate-[24deg] rounded-full bg-gradient-to-b from-butter/35 via-butter/10 to-transparent blur-2xl" />
            </div>
        )
    }

    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {/* soft light ray angling in from the window — angle now tracks
                the window's simulated sun position (`--env-angle`) instead
                of a fixed 24deg, so it visibly sweeps over the course of a
                day without ever "jumping". */}
            <div
                className="ambient-ray absolute -left-10 -top-10 h-[70%] w-[45%] rounded-full bg-gradient-to-b from-butter/35 via-butter/10 to-transparent blur-2xl"
                style={{ transform: 'rotate(var(--env-angle, 24deg))', transition: 'transform 60s linear' }}
            />

            {/* drifting shadow — a very faint, slow-moving darker patch that
                trails opposite the light ray, the "slow drifting shadows"
                requirement. Its own opacity is tied to brightness (deeper
                shadow at midday, all but invisible at night) and its motion
                to `--env-motion`, so it goes still along with everything
                else when Mochi is sleeping or the room is quiet. */}
            <div
                className="env-shadow-drift absolute bottom-0 right-0 h-[55%] w-[50%] rounded-full bg-ink/10 blur-3xl"
                style={{
                    opacity: 'calc(0.12 * var(--env-brightness, 0.6))',
                    transform: 'rotate(calc(-1 * var(--env-angle, 24deg)))',
                    transition: 'opacity 60s linear, transform 60s linear',
                }}
            />

            {/* drifting dust motes — opacity live-scaled by --env-motion so
                the room's own liveliness (time of day + Mochi's state)
                thins them out or brings them back, without regenerating
                the randomized list. */}
            {motes.map((mote) => (
                <span
                    key={mote.id}
                    className="ambient-mote absolute rounded-full bg-white"
                    style={{
                        left: `${mote.left}%`,
                        top: `${mote.top}%`,
                        width: mote.size,
                        height: mote.size,
                        opacity: `calc(${mote.opacity} * var(--env-motion, 1))`,
                        animationDuration: `${mote.duration}s`,
                        animationDelay: `${mote.delay}s`,
                    }}
                />
            ))}

            {/* rain — window-streak style, straight falling lines. Storms
                get more of them and a touch of screen-shake-free flicker
                via env-weather-flash (see globals.css). */}
            {rainDrops.map((drop) => (
                <span
                    key={drop.id}
                    className="ambient-rain absolute top-[-10%] h-[22%] w-px bg-gradient-to-b from-transparent via-white/40 to-transparent"
                    style={{
                        left: `${drop.left}%`,
                        animationDuration: `${drop.duration}s`,
                        animationDelay: `${drop.delay}s`,
                    }}
                />
            ))}
            {weather === 'stormy' && <div className="env-weather-flash absolute inset-0 bg-white" />}

            {/* snow — slow fall with a gentle side-to-side drift, distinct
                from dust motes both in size and in not being
                motion-scaled (snow still drifts down at "quiet, hushed"
                speed even when --env-motion is near zero, since a snowy
                sky is already the hushed one). */}
            {snowflakes.map((flake) => (
                <span
                    key={flake.id}
                    className="ambient-snow absolute top-[-5%] rounded-full bg-white/80"
                    style={
                        {
                            left: `${flake.left}%`,
                            width: flake.size,
                            height: flake.size,
                            animationDuration: `${flake.duration}s`,
                            animationDelay: `${flake.delay}s`,
                            '--snow-drift': `${flake.drift}px`,
                        } as CSSProperties
                    }
                />
            ))}
        </div>
    )
}

export default AmbientLayer
