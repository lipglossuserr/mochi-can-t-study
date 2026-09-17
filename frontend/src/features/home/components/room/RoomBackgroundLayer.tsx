/**
 * RoomBackgroundLayer
 *
 * The farthest-back plane of the room: the wall itself. This layer answers
 * "what is the room made of" before anything sits in front of it — a warm
 * painted wall, a hint of wallpaper texture, a ceiling shadow so the top
 * edge reads as a corner rather than a cropped rectangle, and a soft
 * diagonal wash of daylight coming from the window's corner.
 *
 * Purely decorative, `aria-hidden`, no state, no animation classes beyond
 * the pre-existing global vocabulary — this layer is intentionally the
 * quietest one so everything placed in front of it has somewhere to sit.
 */
function RoomBackgroundLayer() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {/* wall */}
      <div className="absolute inset-0 bg-gradient-to-b from-petal via-blush-light to-taro-light/70" />

      {/* ceiling shadow — a soft darkening at the very top edge so the wall
          reads as going up into a ceiling, not stopping at a hard line */}
      <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-ink/10 to-transparent sm:h-14" />

      {/* faint wallpaper stripes */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, var(--color-ink) 0px, var(--color-ink) 1px, transparent 1px, transparent 44px)',
        }}
      />

      {/* natural light gradient — a wide, low-contrast warm wash fanning out
          from the window's corner (top-left), so the wall already feels
          sunlit before the window itself or any glow effect is drawn.
          Sprint 6.1: opacity now follows `--env-brightness` (inherited
          from RoomScene's root) so the wall itself dims toward night
          rather than only the floor-level lighting in RoomDepthLayer. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 12% 0%, rgba(255,247,224,0.55), rgba(255,247,224,0) 60%)',
          opacity: 'calc(0.35 + var(--env-brightness, 0.7) * 0.5)',
          transition: 'opacity 60s linear',
        }}
      />
    </div>
  )
}

export default RoomBackgroundLayer
