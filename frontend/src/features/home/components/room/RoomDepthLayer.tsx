/**
 * RoomDepthLayer
 *
 * The room's lighting system. Nothing here is furniture — it's the floor
 * plane, the shadows and glows that make the wall and floor read as two
 * planes meeting at a corner, plus (Sprint 6.1) the time-of-day lighting
 * itself: a warm morning, neutral afternoon, golden evening, or cool
 * moonlit night, all read from `--env-warmth`/`--env-brightness` (written
 * by `AmbientLayer` onto `RoomScene`'s root and inherited down to here —
 * see that component's header for why it's written imperatively rather
 * than passed as a prop).
 *
 * The original slow (28s) opacity breathe on the window-light wash is
 * untouched — it's layered ON TOP of the new time-aware base opacity via
 * `calc()`, so the room still has its one small "alive" pulse regardless
 * of what time it is.
 *
 * Sits between the background wall and the furniture layers, so
 * middle/foreground objects visually rest *inside* this light rather than
 * having it painted over them.
 */
function RoomDepthLayer() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {/* scoped keyframes — local to this component, no globals.css edits.
          One slow (28s) opacity breathe on the window-light wash: the
          single "gentle light change" the original design asked for, kept
          subtle enough that it registers as "the room feels alive," not as
          a visible animation. */}
      <style>{`
        @keyframes room2-light-breathe {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* golden-hour light wash sweeping from the window corner across the
          room — the thing that makes the light feel like it's *coming from
          somewhere* rather than being an even, sourceless glow. Its base
          opacity now scales with `--env-brightness` (dimmer at night) and
          its color warms/cools with `--env-warmth`, so "warm morning" and
          "cool moonlit night" are the same element, just different numbers. */}
      <div
        className="absolute left-0 top-0 h-[70%] w-[65%]"
        style={{
          background:
            'radial-gradient(closest-side, color-mix(in srgb, rgb(255,232,168) calc(var(--env-warmth, 0.6) * 100%), rgb(190,210,255)) 0%, transparent 75%)',
          opacity: 'calc(0.35 + var(--env-brightness, 0.7) * 0.35)',
          animation: 'room2-light-breathe 28s ease-in-out infinite',
          animationTimingFunction: 'var(--ease-soft, ease-in-out)',
          transition: 'background 60s linear, opacity 60s linear',
        }}
      />

      {/* moonlit-night wash — a cool, faint blue-violet glow that only
          reads once brightness drops low (deep evening/night), replacing
          the golden wash's job rather than fighting it; both are additive
          so the crossover (dusk) blends the two instead of cutting away. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 15% 10%, rgba(160,180,255,0.22), rgba(160,180,255,0) 60%)',
          opacity: 'calc((1 - var(--env-brightness, 0.7)) * 0.9)',
          transition: 'opacity 60s linear',
        }}
      />

      {/* soft spotlight behind Mochi — the one static depth cue that tells
          the eye "this is the center of the room" before anything moves;
          scales gently with brightness so she isn't lit as if by daylight
          at 2am. */}
      <div
        className="absolute left-1/2 top-[18%] h-[55%] w-[80%] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(closest-side, rgba(255,255,255,0.55), rgba(255,255,255,0) 72%)',
          opacity: 'calc(0.4 + var(--env-brightness, 0.7) * 0.5)',
          transition: 'opacity 60s linear',
        }}
      />

      {/* corner vignette — a faint darkening in all four corners so the
          room reads as having depth/volume rather than being lit perfectly
          evenly, like a flat illustration */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(140% 100% at 50% 40%, transparent 55%, rgba(75,46,61,0.10) 100%)',
        }}
      />

      {/* floor */}
      <div className="absolute inset-x-0 bottom-0 h-[28%] bg-gradient-to-b from-taro/25 to-taro/40">
        <div
          className="h-full w-full opacity-40"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, transparent 0px, transparent 62px, rgba(75,46,61,0.18) 63px)',
          }}
        />
        {/* wall/floor seam — a thin shadow so the two planes read as a corner, not a flat sticker */}
        <div className="absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-ink/10 to-transparent" />
        {/* floor-level warm glow, softer echo of the window light landing on the ground — dims with brightness like everything else in this layer */}
        <div
          className="absolute bottom-0 left-0 h-full w-[55%]"
          style={{
            background: 'linear-gradient(90deg, rgba(255,232,168,0.25), rgba(255,232,168,0) 80%)',
            opacity: 'calc(0.3 + var(--env-brightness, 0.7) * 0.45)',
            transition: 'opacity 60s linear',
          }}
        />
      </div>
    </div>
  )
}

export default RoomDepthLayer
