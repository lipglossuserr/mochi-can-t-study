/**
 * RoomForegroundLayer
 *
 * The floor-level objects closest to the viewer — the things that turn
 * "a room with a cat in it" into "a room this cat actually lives in."
 * Every object here anticipates a specific future interaction (see
 * CHANGES.md) without implementing it: no handlers, no state, just shape
 * and placement. The scratching post and toy basket are deliberately
 * pushed to the edges of the frame, partially cropped by `RoomScene`'s
 * `overflow-hidden` shell, so the floor reads as continuing beyond the
 * visible room rather than stopping exactly at the container's edge.
 */
function RoomForegroundLayer() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {/* cat bed — tucked into the back-left corner near the plant, a
          future sleep spot; set slightly behind the rug's front edge so it
          reads as further from the viewer, and cropped by the left edge so
          the floor implies it continues past what's visible */}
      <div className="absolute bottom-[20%] left-[-8px] h-6 w-14 sm:bottom-[19%] sm:h-9 sm:w-24">
        <div className="absolute inset-0 rounded-[50%] bg-blush/50 blur-[1px]" />
        <div className="absolute inset-x-1 bottom-0 h-[70%] rounded-[50%] border-2 border-white/60 bg-cream/90 shadow-inner" />
        <div className="absolute inset-x-3 bottom-[18%] h-[35%] rounded-[50%] bg-blush-light/70" />
      </div>

      {/* food bowl — a small pair of bowls on the open floor, a future
          feeding spot, placed between the cat bed and the rug */}
      <div className="absolute bottom-[19%] left-[20%] flex items-end gap-1 sm:bottom-[18%] sm:gap-1.5">
        <div className="h-2 w-4 rounded-b-full rounded-t-sm border border-taro-dark/30 bg-cream sm:h-3 sm:w-6">
          <div className="mx-auto mt-[1px] h-[55%] w-[70%] rounded-full bg-butter/70" />
        </div>
        <div className="h-2 w-4 rounded-b-full rounded-t-sm border border-taro-dark/30 bg-cream sm:h-3 sm:w-6">
          <div className="mx-auto mt-[1px] h-[55%] w-[70%] rounded-full bg-blush/50" />
        </div>
      </div>

      {/* rug beneath Mochi — sized for the now much bigger cat; its shadow breathes with the room */}
      <div className="room-rug absolute bottom-[9%] left-1/2 h-11 w-56 -translate-x-1/2 rounded-[50%] bg-blush/40 blur-[1px] sm:h-16 sm:w-80" />

      {/* cushion — a small round seat at the rug's front-left edge, a place
          Mochi already half-occupies the room around */}
      <div className="absolute bottom-[10%] left-[30%] h-4 w-7 -translate-x-1/2 sm:bottom-[11%] sm:h-6 sm:w-11">
        <div className="absolute inset-x-1 -bottom-1 h-1.5 rounded-[50%] bg-ink/10 blur-[2px]" />
        <div className="absolute inset-0 rounded-[50%] bg-berry/50 shadow-inner" />
        <div className="absolute inset-x-2 top-[15%] h-[2px] rounded-full bg-white/30" />
      </div>

      {/* scratching post — stands beside where Mochi sits on the rug, a
          future interaction point; tall enough to rise past the floor band
          into open wall space so it reads as real furniture, not a floor decal */}
      <div className="absolute bottom-[9%] right-[18%] h-16 w-5 sm:bottom-[8%] sm:h-24 sm:w-8">
        <div className="absolute -bottom-1 left-1/2 h-2 w-9 -translate-x-1/2 rounded-[50%] bg-ink/10 blur-[2px] sm:w-14" />
        <div className="absolute bottom-0 left-1/2 h-3 w-9 -translate-x-1/2 rounded-md bg-taro-dark/40 sm:h-4 sm:w-14" />
        <div
          className="absolute bottom-3 left-1/2 h-[75%] w-full -translate-x-1/2 rounded-full bg-rosegold/70 sm:bottom-4"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(75,46,61,0.18) 0px, rgba(75,46,61,0.18) 2px, transparent 2px, transparent 7px)',
          }}
        />
        <div className="absolute -top-1 left-1/2 h-3 w-5 -translate-x-1/2 rounded-full bg-matcha/70 sm:h-4 sm:w-7" />
      </div>

      {/* toy basket — near the rug, a future play spot; a yarn ball and a
          toy stick peek over the rim. Pushed toward the right edge and
          nudged partly outside the frame so the room feels wider than the
          viewport. */}
      <div className="absolute bottom-[9%] right-[-10px] h-8 w-11 sm:bottom-[8%] sm:h-12 sm:w-16">
        <div className="absolute -bottom-1 left-1/2 h-2 w-10 -translate-x-1/2 rounded-[50%] bg-ink/10 blur-[2px] sm:w-14" />
        <div
          className="absolute bottom-0 h-[70%] w-full rounded-b-2xl rounded-t-md border-2 border-taro-dark/30 bg-rosegold/40"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(75,46,61,0.15) 0px, rgba(75,46,61,0.15) 1px, transparent 1px, transparent 5px)',
          }}
        />
        {/* yarn ball, resting just against the basket's rim */}
        <span
          className="absolute -top-1 left-1 h-3 w-3 rounded-full bg-berry/70 sm:h-4 sm:w-4"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0px, rgba(255,255,255,0.35) 1px, transparent 1px, transparent 3px)',
          }}
        />
        {/* toy stick leaning out of the basket */}
        <span className="absolute -top-2 right-1.5 h-4 w-[3px] -rotate-[24deg] rounded-full bg-matcha/70 sm:h-5" />
      </div>

      {/* paw prints — a faint, quiet trail between the cat bed and the
          rug, the smallest possible hint that Mochi walks this floor */}
      <div className="absolute bottom-[15%] left-[24%] opacity-[0.14] sm:bottom-[14%]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute h-2 w-1.5 rounded-full bg-ink sm:h-2.5 sm:w-2"
            style={{ left: `${i * 14}px`, bottom: `${(i % 2) * 6}px`, transform: `rotate(${i * 8 - 8}deg)` }}
          />
        ))}
      </div>
    </div>
  )
}

export default RoomForegroundLayer
