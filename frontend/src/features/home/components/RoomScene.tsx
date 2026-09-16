import { forwardRef, useRef, type ReactNode } from 'react'
import AmbientLayer from './AmbientLayer'
import RoomBackgroundLayer from './room/RoomBackgroundLayer'
import RoomDepthLayer from './room/RoomDepthLayer'
import RoomMiddleLayer from './room/RoomMiddleLayer'
import RoomForegroundLayer from './room/RoomForegroundLayer'

interface RoomSceneProps {
  children: ReactNode
  /**
   * Sprint 7.5B: data-driven furniture, slotted between the static
   * RoomForegroundLayer and AmbientLayer — i.e. still behind Mochi
   * (`children` renders afterward, at `z-10`), same depth position the
   * hand-placed floor/wall furniture layers already occupy. Typically a
   * `<PlacedFurnitureLayer entries={placedBehind} .../>` filtered to
   * `item.layer === 'BEHIND_MOCHI'`. Optional — omitting it renders the
   * room exactly as it did before this existed.
   */
  placedBehind?: ReactNode
  /**
   * The `IN_FRONT_OF_MOCHI` counterpart to `placedBehind` — rendered
   * after `children`, above Mochi's own `z-10` stacking context, so
   * these items visually sit in front of her (e.g. something she's
   * partly behind).
   */
  placedInFront?: ReactNode
}

/**
 * RoomScene
 *
 * Mochi's living room, built as four stacked layers (back to front):
 *
 *   RoomBackgroundLayer  — the wall itself: paint, wallpaper, ceiling shadow
 *   RoomDepthLayer       — floor, lighting, glow, vignette (no objects)
 *   RoomMiddleLayer      — wall/back furniture: window, bookshelf, plant,
 *                          photo, clock, curtains
 *   RoomForegroundLayer  — floor-level objects nearest the viewer: rug,
 *                          cushion, cat bed, scratching post, bowl, basket
 *
 * `AmbientLayer` sits on top of all four, and `children` (Mochi + her
 * nameplate) renders above everything, centered in the room.
 *
 * Sprint 6.1: this root element is where the Environment system writes
 * its CSS custom properties (`--env-warmth`, `--env-brightness`,
 * `--env-angle`, `--env-motion`). Every layer below reads them via
 * ordinary CSS variable inheritance — nothing is passed as a prop, so a
 * future layer/renderer can opt in just by referencing `var(--env-*,
 * fallback)` in its own styles. `AmbientLayer` is the one component
 * that actually owns writing those variables (see its own header) and
 * is the seam where character state gets folded in too.
 *
 * Sprint 7.5B: the root element is now ALSO exposed via a forwarded
 * ref (kept in sync with the pre-existing internal `roomRef` via a
 * merge callback below — AmbientLayer keeps reading the internal ref
 * directly, so its behavior is unchanged), so a parent (HomeRoomPage)
 * can reuse this exact element as the coordinate frame for
 * `PlacedFurnitureLayer`/`InventoryTray`'s drop-zone hit-testing. The
 * room's own bounding rect IS the space `RoomLayoutEntry.x`/`y`
 * percentages are relative to, so there's exactly one rect anything
 * furniture-placement-related ever measures against, not a second copy
 * a parent would otherwise have to keep in sync with this one.
 */
const RoomScene = forwardRef<HTMLDivElement, RoomSceneProps>(function RoomScene(
    { children, placedBehind, placedInFront },
    forwardedRef,
) {
  const roomRef = useRef<HTMLDivElement>(null)

  return (
      <div
          ref={(node) => {
            roomRef.current = node
            if (typeof forwardedRef === 'function') forwardedRef(node)
            else if (forwardedRef) forwardedRef.current = node
          }}
          className="relative isolate overflow-hidden rounded-[2.5rem] border border-white/50 shadow-[0_30px_80px_-25px_rgba(224,112,158,0.45)] sm:rounded-[3rem]"
      >
        <RoomBackgroundLayer />
        <RoomDepthLayer />
        <RoomMiddleLayer />
        <RoomForegroundLayer />
        {placedBehind}

        {/* quiet atmosphere: light ray + drifting dust + environment vars */}
        <AmbientLayer targetRef={roomRef} />

        {/* content: Mochi + nameplate — generous top/bottom room so nothing
          feels stacked against the window or the rug. Bottom padding
          nudged up slightly (pb-14→16, pb-20→24) so Mochi's grounding
          shadow has clear air above the floor furniture instead of
          crowding it.

          `pointer-events-none` here is load-bearing, not decorative:
          this is the ONE normal-flow element in the whole room (every
          other layer is `absolute inset-0`), so its box is what
          actually determines RoomScene's rendered height — in practice
          it spans nearly the entire room, padding included. Sitting at
          z-10, that box was ABOVE the BEHIND_MOCHI furniture layer's
          z-index (~1–9), so an invisible click-catcher was intercepting
          every drag meant for already-placed furniture behind Mochi —
          the item would still render (and still wiggle in decor mode),
          it just never received the pointer event. `pointer-events-auto`
          is restored below, scoped to just Mochi's own drop-zone div in
          HomeRoomPage, so petting/boop still works exactly as before. */}
        <div className="pointer-events-none relative z-10 flex flex-col items-center px-6 pb-16 pt-20 sm:pb-24 sm:pt-24">
          {children}
        </div>

        {placedInFront}
      </div>
  )
})

export default RoomScene
