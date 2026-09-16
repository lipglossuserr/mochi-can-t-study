# Sprint 6.6D-2 — Renderer Architecture & Automatic Fallback

## What changed

### 1. Capability-driven rendering (`capability/resolveRenderPath.ts`)
`resolveRenderPath(state, registry)` is now the single function every
render decision goes through. Tier **priority** is a fixed design choice
(state-machine > timeline-overlay > procedural > safe-idle — a state-
machine-authored motion is richer than a raw timeline mix, which is
richer than a procedural placeholder), but **availability** at each tier
is never assumed — it's checked live against whatever
`RendererCapabilityRegistry` actually found on the loaded asset. Nothing
hardcodes "ViewModel exists" or "this timeline exists"; every check is a
live lookup.

### 2. Automatic fallback
`RiveCharacterRenderer`'s transition effect now calls `resolveRenderPath`
on every state change and acts on exactly the tier it returns:
- `state-machine` → drives the real input(s) for that state.
- `timeline-overlay` → plays the overlay timeline(s) for that state.
- `procedural` → deliberately does nothing on the Rive canvas;
  `ProceduralLayer` (always mounted) carries the whole visual signal.
- `safe-idle` → stops any lingering overlays and logs `console.error`
  with the specific reason. Only reachable for a state with no capability
  at any tier — every one of the 22 states the engine currently emits has
  at least a procedural `StateToClipMap` entry, so this is a last-resort
  net for an unrecognized future state string, not a path any known
  state takes today.

Exit logic is now tier-aware too: it undoes whatever tier was *actually*
active for the previous state (tracked in `activeTierRef`), not whatever
tier the code would use for that state in general — so a mid-session
capability change can't leave a stale input set.

### 3. Every semantic state → exactly one render path
`resolveRenderPath` is a pure function; same `(state, registry)` always
resolves to the same one tier. `validateCapabilities.ts` now calls it for
all 22 known states at load and flags any `safe-idle` result as an error
— using the *same* function the renderer itself uses, not a separate
static check that could drift from runtime reality (6.6D-1's version
checked only whether a hand-written mapping existed, which couldn't tell
"mapped but not actually backed by the asset" apart from "properly
covered").

### 4. Render ownership (`capability/renderOwnership.ts`)
Formal table assigning each of Position/Rotation/Scale/Opacity/Animation
State/Effects to exactly one owner:

| Property | Owner | Applied in |
|---|---|---|
| Position | Navigation | `react/Character.tsx` |
| Rotation | ProceduralLayer | `ProceduralLayer.tsx` |
| Scale | ProceduralLayer | `ProceduralLayer.tsx` |
| Opacity | TransitionCompositor | `TransitionCompositor.tsx`, consumed in `CombinedCharacterRenderer.tsx` |
| Animation State | RiveCharacterRenderer | `RiveCharacterRenderer.tsx` |
| Effects | ProceduralLayer | `ProceduralLayer.tsx` |

`TransitionCompositor`'s `useRiveCrossfade` was written in Sprint 6.6 but
never actually wired into the live renderer tree — it's now genuinely the
sole opacity owner, cross-fading `CombinedCharacterRenderer`'s root
whenever the resolved state OR its render-path tier changes, so a
capability fallback mid-session reads as a soft dip instead of a snap.

This is a documentation-and-reference contract, not a runtime enforcement
mechanism — see the doc comment in `renderOwnership.ts` for why (no
practical way to intercept arbitrary writes across three independent
libraries without a much heavier abstraction this sprint's scope doesn't
call for). What's actually enforced by the code itself: each property is
written from exactly one file, named in the table, so a second writer
appearing anywhere else is a one-grep check away.

### 5. Removed obsolete/duplicate renderer implementations
Deleted outright (superseded by capability-driven resolution, not just
unwired):
- `renderers/hybrid/HybridCharacterRenderer.tsx`
- `renderers/hybrid/RiveClipPlayer.ts`
- `renderers/hybrid/index.ts`

The `hybrid/` folder itself is retired — there's no more "hybrid vs.
non-hybrid," this is the one architecture. Still-canonical files moved up
to `renderers/`:
- `ProceduralLayer.tsx`
- `StateToClipMap.ts` (with `riveClip`/`riveLoop`/`ConfirmedRiveClip`
  fields removed — confirmed unused outside the two deleted files above)
- `TransitionCompositor.tsx`
- `SPRINT_6_6_CHANGES.md` (kept as historical record)

## Files added
- `capability/resolveRenderPath.ts`
- `capability/renderOwnership.ts`

## Files changed
- `RiveCharacterRenderer.tsx` — transition effect rewritten around
  `resolveRenderPath`; tracks `activeTierRef` for tier-aware exit logic.
- `CombinedCharacterRenderer.tsx` — now the one canonical renderer;
  wires `useRiveCrossfade` for opacity.
- `capability/rendererContract.ts` — added `STATE_REQUIRED_INPUTS`
  (per-state, not just a flat global list) and `ALL_SEMANTIC_STATES`
  (moved here from `validateCapabilities.ts` so `resolveRenderPath` can
  use it too).
- `capability/validateCapabilities.ts` — state-coverage check now calls
  `resolveRenderPath` instead of a separate static mapping check.
- `capability/rendererDiagnosticsStore.ts` / `RendererDiagnosticsOverlay.tsx`
  — added `renderPath` (tier + reason) to the published/displayed
  snapshot.
- `renderers/index.ts` — history comment updated to reflect the deletion.

## Remaining issues
- `RiveCharacterRenderer`'s state-machine input names are still only
  validated for *existence*, not confirmed to produce the expected
  visual result — an input that exists but is wired to something
  unexpected inside the .riv file wouldn't be caught by this sprint's
  validation.
- The render ownership contract is documentation-enforced, not
  compile-time-enforced; see the note above.
- No install/build was run against this tree in this environment;
  recommend `npm install && npm run build` as the first check.
