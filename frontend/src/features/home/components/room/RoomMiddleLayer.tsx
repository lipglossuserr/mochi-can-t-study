/**
 * RoomMiddleLayer
 *
 * The wall-mounted and against-the-wall furniture: window, curtains,
 * bookshelf, potted plant, a framed photo, and a wall clock. Everything
 * here is placed against the back wall or in a wall corner — nothing
 * floats in open floor space, which is what keeps this read as
 * "furniture," not "icons scattered on a background."
 *
 * The window/bookshelf/plant markup and their existing global animation
 * classes (`room-cloud`, `room-sun`, `room-plant`, `room-hover`) are
 * unchanged from Sprint 5.2A. Sprint 6.1 added the curtains
 * (`env-curtain`) beside the window and tied the plant's existing sway
 * to the same `--env-motion` variable the curtains read — see
 * globals.css and `AmbientLayer` for where that variable comes from.
 */
function RoomMiddleLayer() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {/* window — pushed toward the corner so the room reads wide, not centered-and-cramped */}
      <div className="absolute left-4 top-4 h-16 w-24 overflow-hidden rounded-t-[3rem] rounded-b-2xl border-4 border-white/70 shadow-inner sm:left-10 sm:top-10 sm:h-28 sm:w-44">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-blush-light to-matcha-light/60" />
        {/* drifting clouds — cross the pane on long offset loops */}
        <span className="room-cloud absolute top-3 h-2.5 w-8 rounded-full bg-white/85 sm:h-3 sm:w-10" />
        <span
          className="room-cloud absolute top-8 h-2 w-6 rounded-full bg-white/70 sm:top-11 sm:h-2.5 sm:w-8"
          style={{ animationDelay: '-9s', animationDuration: '26s' }}
        />
        <div className="room-sun absolute right-3 top-3 h-4 w-4 rounded-full bg-butter shadow-[0_0_12px_2px_rgba(255,240,217,0.9)] sm:h-5 sm:w-5" />
        <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-white/70" />
        <div className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-white/70" />
      </div>

      {/* curtains (Sprint 6.1) — a pair of soft panels just outside the
          window frame, occasionally swaying. Amplitude reads `--env-motion`
          (inherited from RoomScene's root, see AmbientLayer), so they sway
          a little more when Mochi's energetic and settle when she's asleep
          or the room is quiet at night — never in lockstep with the plant
          or the dust, since their own period (7.6s) doesn't divide evenly
          into either of theirs. */}
      <div
        className="env-curtain absolute left-2 top-1 h-[4.75rem] w-4 rounded-t-full rounded-b-md bg-blush/55 shadow-sm sm:left-7 sm:top-6 sm:h-[8rem] sm:w-6"
        style={{ transformOrigin: '50% 0%' }}
      />
      <div
        className="env-curtain absolute left-[6.9rem] top-1 h-[4.75rem] w-4 rounded-t-full rounded-b-md bg-blush/55 shadow-sm sm:left-[13.4rem] sm:top-6 sm:h-[8rem] sm:w-6"
        style={{ transformOrigin: '50% 0%', animationDelay: '-3.4s' }}
      />

      {/* wall clock — sits on the open stretch of wall between the window
          and the bookshelf, a little above the furniture line, deliberately
          off-center so it doesn't split the room symmetrically */}
      <div className="absolute right-[34%] top-3 h-8 w-8 rounded-full border-2 border-taro-dark/40 bg-cream/90 shadow sm:top-6 sm:h-11 sm:w-11">
        <span className="absolute left-1/2 top-1/2 h-[28%] w-[2px] -translate-x-1/2 -translate-y-full origin-bottom -rotate-[20deg] rounded-full bg-ink/60" />
        <span className="absolute left-1/2 top-1/2 h-[38%] w-[1.5px] -translate-x-1/2 -translate-y-full origin-bottom rotate-[95deg] rounded-full bg-ink/50" />
        <span className="absolute left-1/2 top-1/2 h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-taro-dark/70" />
      </div>

      {/* framed photo — a small keepsake between the clock and the
          bookshelf, an abstract little scene rather than a real image */}
      <div className="absolute right-[15%] top-6 h-9 w-8 rounded-sm border-2 border-white/80 bg-cream shadow sm:top-9 sm:h-14 sm:w-12">
        <div className="absolute inset-[3px] overflow-hidden rounded-[1px] bg-matcha-light/50">
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-butter sm:h-2 sm:w-2" />
          <span className="absolute bottom-0 left-0 h-[45%] w-full rounded-t-full bg-matcha/60" />
        </div>
      </div>

      {/* bookshelf — pushed to the far edge, tiny hover response, motion-token timing */}
      <div className="room-hover absolute bottom-[26%] right-3 h-14 w-12 rounded-md border-2 border-taro-dark/30 bg-cream/80 shadow sm:bottom-[24%] sm:right-10 sm:h-24 sm:w-20">
        <div className="absolute inset-x-1 top-1/3 h-[2px] bg-taro-dark/25" />
        <div className="absolute inset-x-1 top-2/3 h-[2px] bg-taro-dark/25" />
        <div className="absolute bottom-1 left-1 top-2/3 flex items-end gap-[3px] pb-[3px]">
          <span className="h-[70%] w-[5px] rounded-sm bg-berry/60" />
          <span className="h-[90%] w-[5px] rounded-sm bg-matcha/60" />
          <span className="h-[55%] w-[5px] rounded-sm bg-taro/70" />
          <span className="h-[80%] w-[5px] rounded-sm bg-rosegold/70" />
        </div>
        {/* shelf decorations — a tiny potted succulent and a leaning stack
            of books sitting on top of the shelf, the detail that suggests
            someone actually arranged this shelf rather than just filling it */}
        <div className="absolute -top-3 left-1 flex items-end gap-1 sm:-top-4 sm:gap-1.5">
          <span className="h-2 w-3 rounded-t-full bg-matcha sm:h-3 sm:w-4" />
          <span className="h-1 w-2 rounded-sm bg-rosegold/70 sm:h-1.5 sm:w-3" />
        </div>
      </div>

      {/* potted plant — pushed to the far edge to balance the bookshelf */}
      <div className="absolute bottom-[26%] left-3 sm:bottom-[24%] sm:left-10">
        <div className="room-plant relative mx-auto h-9 w-9 sm:h-14 sm:w-14">
          <span className="absolute left-1/2 top-0 h-7 w-4 -translate-x-[85%] -rotate-[18deg] rounded-full bg-matcha sm:h-9 sm:w-5" />
          <span className="absolute left-1/2 top-0 h-8 w-4 -translate-x-1/2 rounded-full bg-matcha-light sm:h-10 sm:w-5" />
          <span className="absolute left-1/2 top-0 h-7 w-4 translate-x-[-15%] rotate-[18deg] rounded-full bg-matcha sm:h-9 sm:w-5" />
        </div>
        <div className="mx-auto -mt-1 h-4 w-7 rounded-b-xl rounded-t-sm bg-berry/70 sm:h-5 sm:w-10" />
      </div>
    </div>
  )
}

export default RoomMiddleLayer
