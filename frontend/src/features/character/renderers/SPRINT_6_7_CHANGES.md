# Sprint 6.7 — Runtime QA & Interaction Polish

Verification, bug fixing, and interaction polish only. `CharacterEngine`, the renderer
architecture (state-machine → timeline-overlay → procedural → safe-idle tiers), and the
capability system were audited but **not** redesigned — every fix below is a targeted
change inside an existing file, in an existing function, doing what that function already
claimed to do.

## 1. Runtime verification (static/code audit — no browser available in this environment)

- **Every semantic state** (`KnownCharacterState` × `IdleMicroId`, 22 unique strings)
  cross-checked against `STATE_TO_CLIP_MAP` (procedural tier — one entry per state,
  confirmed complete), `STATE_OVERLAYS`/`STATE_MACHINE_HANDLED_STATES`/
  `STATE_REQUIRED_INPUTS` (rendererContract.ts), and `ALL_SEMANTIC_STATES` /
  `ALL_KNOWN_STATES` / `ALL_IDLE_MICRO_STATES` (the hand-duplicated arrays the contract
  file's own comment flags as a manual-sync risk). All three are in sync with the two
  source-of-truth unions in `types.ts` / `CharacterEngine.ts` — no drift found.
- **Every render tier** traced through `resolveRenderPath()`: state-machine tier requires
  `STATE_REQUIRED_INPUTS[state]` to be fully present on the live registry; timeline-overlay
  requires every name in `STATE_OVERLAYS[state]` present (no partial-overlay fallback, by
  design); procedural requires a `STATE_TO_CLIP_MAP` entry (all 22 states have one); safe-idle
  is the last resort. `validateRendererCapabilities()` independently re-runs
  `resolveRenderPath` for every state at load and flags any that land on safe-idle as an
  error — confirmed none currently do.
- **Fallback behavior**: confirmed `resolveRenderPath` reads the live `CapabilitySnapshot`
  fresh on every call (no caching that could go stale) and that `registry === null`
  (asset not yet loaded) correctly routes straight to procedural rather than guessing.
- **No renderer state left able to get stuck**: traced `CharacterStateMachine.pushOverlay` /
  `setBase` (every overlay always resolves via a tracked, always-cleared `setTimeout`) and
  `CharacterEngine.react()` / `reactToPetting()` (generation counters + explicit timer
  clearing prevent a stale reaction from re-firing after a newer one interrupts it) — no
  path found that leaves `overlay` non-null forever or leaves a Rive input "stuck" set.
- **ViewModel/timeline verification**: this environment has no browser/WebGL context to
  actually load `mochi.riv` and inspect it live, so "every ViewModel property produces the
  intended animation" couldn't be exercised end-to-end here. What *is* verified: the
  Capability Registry inspection code itself (`RendererCapabilityRegistry.ts`) is
  defensive and guarded (try/catch around every accessor, "not detected" treated as
  expected rather than an error), and `RendererDiagnosticsOverlay` (dev-only) already
  surfaces the live inspection result — semantic state, active tier, active input, active
  timelines, and every validation issue — so a real browser session makes any mismatch
  immediately visible without further code changes needed.

## 2. Renderer bug fixes

### The known one-frame black flash — fixed
`RiveCharacterRenderer.tsx`'s overlay cleanup (`overlayStop`, run whenever a timeline-tier
state like `sleeping`, `playing`, `looking-around`, etc. is left) called `rive.stop(names)`
directly. `stop()` immediately rewinds the released animation instance(s) to frame 0; since
the artboard is still being advanced every frame by the always-running state machine, that
rewind was visible for one frame — a pop to each overlay's frame-0 pose (dark/contrasty on
some timelines) right before the new state's visuals took over.

**Fix**: renamed to `overlayRelease` and split into two steps —
1. `rive.pause(names)`, synchronously, immediately. Pausing halts the instance without
   resetting its time, so it holds its last (already on-screen) pose — nothing visibly
   changes the instant this runs.
2. `rive.stop(names)`, deferred one `requestAnimationFrame`. By the time this actually
   runs, the next tier/overlay has already started driving the canvas, so the frame-0
   rewind happens behind the new pose instead of in front of it. This also fully releases
   the instance so it doesn't linger mixed into future blends (see "stale transforms"
   below) — pausing alone would fix the flash but leak a frozen phantom overlay forever.

Both call sites (leaving a timeline-overlay state; the safe-idle last-resort cleanup) now
go through this one function — audited, no other `rive.stop(...)` call exists anywhere in
the renderer tree.

### Cross-fades were snapping, not fading — fixed
`CombinedCharacterRenderer`'s root `<div>` set `style={{ opacity }}` with no CSS
`transition` property. `useRiveCrossfade` was correctly computing 0 → (pause) → 1, but with
no transition declared, the browser applied each opacity value instantly — every "cross-fade"
was actually a one-frame flash-to-transparent-and-back, not a fade, despite the surrounding
code/comments describing a dissolve. Added `transition: 'opacity {CROSSFADE_MS/2}ms
ease-in-out'` (reusing the same constant `useRiveCrossfade` already times its state
transitions against, so the two stay in sync by construction rather than by two separately
hand-tuned numbers). Cross-fades now visibly dip and recover smoothly on every state and
render-tier change, including a capability-driven tier fallback mid-session.

### Stale transforms / visual remnants
The `overlayRelease` fix above is also the fix for this: previously `stop()` ran
immediately and unconditionally, so it was already not literally leaking a stuck overlay —
but there was no in-between "paused, still mixed in" state to worry about *until* this
sprint's flash fix introduced one. Verified the deferred `stop()` always runs (guarded in
try/catch so a torn-down `rive` instance can't throw and skip cleanup) and always targets
exactly the overlay names that were paused, so nothing is left half-released.

## 3. Interaction polish

### Cursor tracking smoothness
`useCursorAwareness` wrote straight into the gaze channel (`engine.gaze.set(...)`) on
every raw `pointermove` event — which can fire well above display refresh rate on
high-poll-rate mice/trackpads, feeding ProceduralLayer's look-tracking spring several
target updates within a single frame it could never actually render in between. Now
coalesces to the *latest* pointer position and flushes once per `requestAnimationFrame`,
so the spring always sees one clean update per rendered frame instead of a burst of
redundant ones. The spring itself (stiffness/damping/mass in ProceduralLayer) is untouched
— this doesn't change how the tracking eases, only how often it's fed.

### Petting responsiveness
`usePetting`'s stroke gesture required the same 55px drag distance for the *first* pet of
a stroke as for every subsequent one — so nothing visibly happened for a beat right after
touching Mochi, which read as unresponsive. Added a separate, shorter
`FIRST_STROKE_THRESHOLD_PX` (18px) that only applies to a stroke's first emit (tracked via
a new `hasEmittedThisStrokeRef`, reset on pointer-down/pointer-up); every emit after the
first in the same stroke still uses the original 55px threshold plus the existing 300ms
cooldown, so a long or slow stroke doesn't spam events any more than it used to.

### Smoother idle/observe/study/play/rest transitions
Covered by the two renderer fixes above — the black-flash and the missing crossfade
transition were the two places a transition between any two of these states could read as
abrupt. No additional per-transition special-casing was added (would have meant new
per-state logic, which this sprint's constraints rule out); the one general mechanism now
actually behaves the way its own documentation already claimed.

## 4. Performance

- **`prefersReducedMotion()`** (character/utils) called `window.matchMedia(query)` — which
  re-parses the media-query string — on every invocation, and it's invoked on nearly every
  `ProceduralLayer` render plus inside the cursor/petting hooks. Now caches the
  `MediaQueryList` at module scope and only reads its already-live `.matches` property on
  each call; still reflects the OS setting correctly, just without re-parsing the query
  every time.
- **Cursor tracking** (see above) removes redundant sub-frame `gaze.set()` calls — fewer
  writes into the imperative channel, same visual result.
- **Diagnostics store** (`rendererDiagnosticsStore`) audited: `publishDiagnostics` is only
  called at load and on confirmed state transitions (`previous === state` is already
  guarded), so `CombinedCharacterRenderer`'s `useSyncExternalStore` subscription doesn't
  cause any re-renders beyond ones a state/tier change already requires. No change needed.
- **Extended-session stability**: overlay timers (`CharacterStateMachine.overlayTimer`,
  `CharacterEngine.reactionTimers`/`pettingSettleTimer`/`focusTimersRef`) are all tracked
  and cleared before being replaced — audited for leaks across repeated reactions over a
  long session; none found. `useCursorAwareness`'s new rAF handle is cancelled on cleanup
  alongside the existing listener removal.

## 5. Verification

```
npm install        # clean
npm run build       # ✓ 568 modules, no errors
npx tsc --noEmit     # 0 errors
npx vitest run       # 3 files / 36 tests, all passing
```

No regressions: all fixes are additive or internal-implementation-only (renamed private
function, new CSS property, rAF coalescing behind the same public hook signature, a second
internal ref in a hook that already tracked several). No `CharacterEngine` state, action,
or event contract changed; no renderer tier, capability check, or ownership boundary was
redesigned; `StateToClipMap`, `resolveRenderPath`, and `rendererContract` are untouched.

## Files touched

- `src/features/character/renderers/RiveCharacterRenderer.tsx` — `overlayStop` →
  `overlayRelease` (pause-then-deferred-stop)
- `src/features/character/renderers/capability/RendererCapabilityRegistry.ts` — stale
  comment reference updated to match
- `src/features/character/renderers/TransitionCompositor.tsx` — doc comment only
  (`CROSSFADE_MS` now documented as the CSS transition duration too)
- `src/features/character/renderers/CombinedCharacterRenderer.tsx` — added the missing
  `transition: opacity` CSS
- `src/features/character/react/useCursorAwareness.ts` — rAF-coalesced pointer updates
- `src/features/character/react/usePetting.ts` — first-stroke responsiveness threshold
- `src/features/character/utils/reducedMotion.ts` — cached `MediaQueryList`

## Not verified live (environment limitation)

This sandbox has no browser/WebGL context, so the actual `.riv` file was never loaded at
runtime here — everything above is a static/code-level audit plus `tsc`/`vitest`/`vite
build`. The dev diagnostics overlay (Sprint 6.6D-1/6.6D-2, unchanged) already surfaces
exactly what a real browser session would need to confirm the ViewModel/timeline claims
live: semantic state, active tier, active input, active timelines, and every validation
issue, all in one panel.
