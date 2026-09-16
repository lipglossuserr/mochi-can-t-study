# Sprint 6.6 — Renderer Activation: Rive + Procedural Motion Layer

## New / Modified Files

| File | Status | Description |
|---|---|---|
| `src/features/character/renderers/hybrid/RiveClipPlayer.ts` | **New** | Thin wrapper that plays confirmed .riv timelines directly by name, bypassing the file's State Machine entirely |
| `src/features/character/renderers/hybrid/StateToClipMap.ts` | **New** | Single table mapping every engine-emitted state to a Rive clip and/or procedural render hints |
| `src/features/character/renderers/hybrid/ProceduralLayer.tsx` | **New** | Motion-driven overlay: blink, breathing, look-tracking, idle micro-variety, emotion overlay, fake walk, fake celebrate |
| `src/features/character/renderers/hybrid/TransitionCompositor.tsx` | **New** | Cross-fade mechanism covering every existing state transition |
| `src/features/character/renderers/hybrid/HybridCharacterRenderer.tsx` | **New** | The active renderer — composes the four modules above |
| `src/features/character/renderers/hybrid/index.ts` | **New** | Public exports for the module |
| `src/features/character/renderers/index.ts` | Modified | Swapped `ActiveCharacterRenderer` from `RiveCharacterRenderer` to `HybridCharacterRenderer` (the one assignment this file exists to isolate) |
| `src/features/character/types.ts` | Fixed | A corrupted doc-comment (stray `*` continuation lines outside their `/** */` block, around `CharacterSnapshot.movement`) broke TS parsing entirely — see "Pre-existing bug found" below. Restored valid syntax; no type/behavior change. |
| `public/RIVE_ASSET_README.md` | Rewritten | Replaced the old (confirmed non-functional) State Machine contract with the real confirmed-clip table |
| `public/mochi.riv` | Added | The asset itself, at the path the renderer loads |
| `src/features/character/renderers/RiveCharacterRenderer.tsx` | Untouched | Left in place, unused, in case of rollback |
| `src/features/character/renderers/LivingMochiRenderer.tsx` | Untouched | Still the load-failure fallback, reused as-is |

No file under `engine/`, `behavior/`, `navigation/`, or `environment/` was modified. Nothing in this sprint changes when/why a state fires — only what's drawn for it.

## Pre-existing bug found (not introduced this sprint)

`character/types.ts` had a malformed doc comment: a `/** ... */` block was closed one line early, leaving four lines of bare `* ...` continuation text as top-level statements. This is not valid TypeScript and fails to parse — confirmed with `tsc --noEmit` before touching anything else — so nothing downstream of it (including the renderer work below) could have compiled as shipped. Fixed by restoring the comment boundary; no types, fields, or logic changed. Flagging it here rather than letting it look like a silent, unrelated cleanup.

## Architecture Decisions

### Library choice: Motion (`framer-motion`), not anime.js

The brief names anime.js or Motion. `framer-motion` is already a dependency (`package.json`) and already used by `LivingMochiRenderer`. Motion is declarative (fits React's lifecycle instead of fighting it), ships real spring physics (`useSpring`) for the "soft settle, not a snap" head/eye tracking the brief asks for, and its `AnimatePresence` directly solves the cross-fade requirement for DOM overlay elements. Adding anime.js would mean a second animation dependency doing a job Motion already does in this codebase. No new packages were added.

### Bypassing the State Machine, not fixing it

`RiveClipPlayer`'s `useRive()` call never passes a `stateMachines` option. Confirmed-working timelines are played with `rive.play([name])` directly — the same mechanism you'd use to scrub to a named clip in a sprite sheet. `playClip()` checks every name against `CONFIRMED_RIVE_CLIPS` and refuses (with a `console.warn`) anything not on that list, so a typo or a future engine state can never silently trigger one of the file's unverified/broken timelines.

### StateToClipMap is the only place state↔clip knowledge lives

`RenderPlan` is a plain object: `{ riveClip, riveLoop, emotion, eyesClosed, fakeCelebrate?, temporaryStandIn? }`. `HybridCharacterRenderer` reads a plan and acts; it contains no state-name conditionals of its own. Sprint 6.7 extends `STATE_TO_CLIP_MAP`, not the compositor or the player.

Every entry the engine can actually put on screen is covered, including four runtime-only overlay ids (`looking-around`, `stretching`, `yawning`, `ambient-thought`) that are pushed by `CharacterEngine.buildIdleBehavior()` but aren't part of the declared `KnownCharacterState` union — found by reading the engine rather than assuming the type declaration was the complete vocabulary. **Post-implementation QA correction:** the original pass covered only three of these four and missed `ambient-thought` (a bond-strength-weighted idle micro-behavior, not a rare edge case); this was caught during review and fixed by adding its `STATE_TO_CLIP_MAP` entry and adding it to `IDLE_LIKE_STATES`. Unknown/future state strings still fall back to `idle`'s plan rather than a blank frame, but that fallback is no longer covering a state the engine actually distinguishes.

### Two flagged gaps, not papered over

- **Studying intensity.** The confirmed asset table has three tiers (`Fokus_lvl_1/2/3`); the engine emits exactly one `studying` state with no intensity signal behind it. `studying` maps to `Fokus_lvl_2` as a neutral default. `Fokus_lvl_1`/`3` are wired and ready but unreachable until an upstream signal (session duration, a focus score, etc.) exists. Not invented here.
- **Cosmetic skin selection.** `orange`/`white`/`calico`/`Black` have no selection signal anywhere in `CharacterSnapshot`. `HybridCharacterRenderer` plays a single fixed default (`orange`) once at boot, alongside `App Launch`.
- **"Breathing-intensity" / emotional-body-language signal.** The brief names Sprint 6.5 signals under these labels; this codebase's actual Sprint 6.5 is `DailyRoutine`, and no field named this way exists. `ProceduralLayer`'s breathing amplitude/speed instead reads `RoomPresenceSnapshot.activityLevel`/`.comfort` (Sprint 5.4, already emitted every snapshot) as the closest real proxy — documented at the call site rather than silently substituted.

### Exit sequencing: the one place transitions aren't purely declarative

Two clips are directional releases, not states themselves — `Break Ending` (exit-rest) and `fishSpawn_off` (play-trigger release). `HybridCharacterRenderer` compares the previous resolved plan's `riveClip` to the next one: leaving `Break` plays `Break Ending` and waits for its completion (via `RiveClipPlayer.onClipComplete`, with a timeout safety net) before applying the next plan; leaving `fishSpawn` fires `fishSpawn_off` without blocking, since both are confirmed clips with no hold needed. This is sequencing of confirmed clips against each other, not new behavioral logic — the engine still decides when state changes; this only decides what plays on the way out.

### Cross-fade: real for DOM overlays, a dip-through for the Rive canvas

Rive keeps one live canvas/runtime instance across every state (remounting `<RiveComponent/>` per transition would reload the whole file). So `useRiveCrossfade` dips canvas opacity to 0, swaps which clip is playing while invisible, and fades back in — total ~260ms, reading as a fade rather than a jump-cut, though there's one image underneath rather than a true two-image dissolve. DOM overlay elements that actually mount/unmount (the emotion glow, the eyes-shut overlay) get a real `AnimatePresence` cross-fade in `ProceduralLayer`, which doesn't share this limitation.

### Fake Walk doesn't duplicate positioning

`<Character/>` already translates the whole element from `NavigationController`'s interpolated position (Sprint 6.3, unmodified). `ProceduralLayer`'s "fake walk" therefore only adds the bob/tilt that suggests a walk cycle and a slightly faster sway while `movement.state === 'walking'` — it does not re-implement translation, per the brief's "don't build a second movement system."

## Verification

Every new/modified file under `renderers/` and `renderers/hybrid/` was type-checked with `tsc --noEmit` against the actual installed versions of `@rive-app/react-canvas` and `framer-motion` (not assumed API shapes) — this caught and fixed one real type mismatch in `RiveClipPlayer`'s event handler. The two remaining `tsc` errors in this subtree (`@/features/pet/types/pet`, `@/features/character` path-alias resolution) are pre-existing, in files this sprint didn't touch, and are a path-alias-in-isolated-typecheck artifact rather than a real bug — they resolve normally under the project's own `tsconfig.json`.

## Deliverable checklist

- [x] RiveClipPlayer module, only exposing confirmed clip names
- [x] ProceduralLayer covering: blink, breathing variation, head/eye look-tracking, idle micro-variety, emotion overlay, fake walk, fake celebrate
- [x] StateToClipMap as a single editable table
- [x] TransitionCompositor handling all existing 6.x state transitions via cross-fade
- [x] Every engine-emitted state (including the three runtime-only overlay ids not in `KnownCharacterState`) resolves to something visible — no silent no-ops
- [x] `StateToClipMap` entries document which are temporary procedural stand-ins pending Sprint 6.7 Synfig assets (`temporaryStandIn` flag + inline `Sprint 6.7 TODO` comments)
