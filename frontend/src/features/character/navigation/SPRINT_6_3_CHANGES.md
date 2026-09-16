# Sprint 6.3 — Autonomous Movement & Spatial Presence

## New / Modified Files

| File | Status | Description |
|---|---|---|
| `src/features/character/navigation/NavigationController.ts` | **New** | Smooth movement execution module |
| `src/features/character/engine/CharacterEngine.ts` | Modified | Composes NavigationController; refactors anchor visit; adds `interruptMovement()` |
| `src/features/character/types.ts` | Modified | Adds `MovementState`, `MovementDirection`, `MovementSnapshot`; adds `movement` to `CharacterSnapshot` |
| `src/features/character/index.ts` | Modified | Exports new movement types and navigation constants |

## Architecture Decisions

### NavigationController as a Fifth Independent Module

`NavigationController` is composed by `CharacterEngine` identically to the four existing behavioral modules (`BehavioralMemory`, `RoomPresence`, `RoutineFamiliarity`, `ObjectAwareness`): it receives a single `onChange` callback in its constructor, publishes snapshot changes through it, owns no knowledge of engine internals, and is initialized, snapshotted, and disposed alongside the other four.

The engine issues movement **intent** — `beginMoveTo(from, to)` — and NavigationController owns **execution**: the tick loop, the ease curve, the direction label, the arriving pause, and the callback chain. This clean boundary means future changes to movement math (different ease curve, variable speed based on emotional state, pathfinding) only touch NavigationController.

### Intent / Execution Separation

```
CharacterEngine.buildAnchorVisitBehavior()
  └─ calls navigation.beginMoveTo(from, anchor, { onSettled })
       └─ NavigationController owns: interpolation, timing, direction
          └─ fires onSettled() after walk + ARRIVING_PAUSE_MS
               └─ engine performs: dwell overlay, schedules return
```

CharacterEngine knows **where** she goes and **what** she does when she gets there. NavigationController knows **how** the position changes over time. Neither knows the other's internals.

### `onArrived` vs `onSettled` Callbacks

`beginMoveTo` supports two callbacks:

- **`onArrived`** — fires the instant walking ends (position snapped to destination, state = `'arriving'`). Reserved for time-critical bookkeeping that shouldn't wait for the settle pause.
- **`onSettled`** — fires after `ARRIVING_PAUSE_MS` (400ms), once state transitions to `'stationary'`. This is the right hook for dwell behaviors — the brief pause reads as "she just got here" rather than "she instantly reacted upon arrival."

Sprint 6.3 exclusively uses `onSettled` for anchor dwell scheduling, satisfying the brief's "pause briefly after arriving" requirement with no manual `setTimeout(fn, ARRIVING_PAUSE_MS)` at the call site.

### Distance-Based Movement Duration

Movement duration is computed from euclidean distance in the 0–100 percentage coordinate space:

```
duration = clamp(distance × 32ms, 1100ms, 3200ms)
```

Examples at the five defined anchors (from HOME_POSITION = {50, 65}):
- `window` {22, 52}: ~30 units → ~960ms → clamped to **1100ms**
- `desk` {72, 52}: ~24 units → ~768ms → clamped to **1100ms**  
- `cushion` {40, 62}: ~11 units → ~352ms → clamped to **1100ms**
- `bookshelf` {78, 40}: ~36 units → **1152ms**
- `plant` {18, 50}: ~34 units → **1088ms** → clamped to **1100ms**

All anchor distances from HOME_POSITION are short enough to hit the minimum. The maximum (3200ms) comes into play for hypothetical full-room crosses (which don't occur in practice since all five anchors are placed within ~40 units of home). The clamping prevents very short moves from feeling like instant teleports.

### Ease-In/Out Curve

Same `(1 - cos(t × π)) / 2` cosine curve `EnvironmentEngine` already uses for smooth value transitions. At the slow speeds this feature operates at, the difference between cosine ease and other curves (cubic bezier, spring) is imperceptible. Using the established pattern avoids introducing a new mathematical dependency.

### `HOME_POSITION = { x: 50, y: 65 }`

The room's default layout center: horizontally centered, 65% down (below the window plane, above the rug foreground in the room layered scene). Defined in `NavigationController.ts` and exported from `index.ts` so renderers that want to know the "default resting point" for CSS alignment purposes can import it as a semantic constant rather than hard-coding `{ x: 50, y: 65 }` independently.

### `clearPosition()` vs `interrupt()`

Two separate methods for two semantically different end-states:

- **`interrupt()`** — preemption. Stops movement immediately AND clears position to null. Called when reactions fire during movement. Position goes to null so the reaction plays from the centered layout default.
- **`clearPosition()`** — natural completion. Called ONLY at the end of a return-home walk's `onSettled`. The movement is done; she's at HOME_POSITION coordinates; now release the explicit coordinate and let CSS layout take over. Position goes from `{50, 65}` to null — visually identical (HOME_POSITION IS the CSS default) but semantically correct.

### `interruptMovement()` in CharacterEngine

```typescript
private interruptMovement(): void {
  this.navigation.interrupt()
  this.objectAwareness.clearCurrentAnchor()
}
```

A single, named point that `react()` and `reactToPetting()` both call — mirrors the existing `clearIdleTimers()` / `clearReactionTimers()` pattern. Ensures navigation doesn't keep ticking during reactions, and the snapshot's `objectAwareness.currentAnchor` correctly reflects null (not mid-visit) while the reaction overlay plays.

### `buildSnapshot()` source of truth change

**Sprint 6.2**: `position` came from `BehaviorController.getPosition()` (stored the last position passed to `requestMove()`).

**Sprint 6.3**: `position` comes from `NavigationController.snapshot().position` — the live interpolated coordinate during movement, null when stationary. The `movement` field (new) is the full `MovementSnapshot`. `BehaviorController.getPosition()` is retained for internal queue tracking but is no longer the canonical position source.

This is a non-breaking change: `CharacterSnapshot.position` retains its type (`CharacterPosition | null`) and semantics (null = default layout), it just updates more frequently during movement.

## Movement Design Rationale

**Why slow?** The brief says "keep movement slow, subtle, and pet-like." Cats and dogs move through a room at roughly 0.5–1.5 m/s in unhurried exploration. Mapped to a room container, that's about 1.5–3 seconds for a meaningful cross — exactly the `MIN_DURATION_MS`–`MAX_DURATION_MS` range.

**Why ease-in/out rather than constant speed?** Constant-speed movement reads as robotic. Ease-in/out — accelerate from rest, decelerate to a stop — is the movement signature of a living thing choosing to go somewhere rather than being commanded to move. Even at 1.1–1.2 seconds, the curve is perceptible.

**Why `HOME_POSITION` rather than tracking "where she was before"?** Simplicity and predictability. An anchor visit is always: start at home → walk to anchor → walk back to home. This means two movements are always computable at behavior-build time, and the return-home path is always the same regardless of session history. Future sprints can introduce "roam from current position" by changing `buildAnchorVisitBehavior`'s `from` logic without touching NavigationController.

**Why 20fps (50ms tick) rather than `requestAnimationFrame`?** Three reasons: (1) `rAF` pauses when the tab is hidden — a hidden-tab anchor visit would never complete, leaving stale position state. (2) At 1–3 second movements over ~30-unit distances, 20fps is indistinguishable from 60fps without running side-by-side. (3) React's `useSyncExternalStore` batches micro-task updates — 20fps publishes from a `setInterval` flow through the same batching as would 60fps `rAF` publishes, making the render count identical in practice.

**Direction detection:** `to.x < from.x ? 'left' : 'right'`. Horizontal movement direction is what renderers need for sprite flipping. Vertical movement is always within a narrow band (anchors cluster between y:40 and y:65), so vertical-only facing is not needed. Ties (x equal) default to 'right' to avoid direction flicker on purely vertical hops.

## UX Reasoning

**Arriving pause reads as intentionality.** Without the 400ms pause, Mochi would "walk in and immediately start looking around" — exactly the same visual rhythm as the existing instant-snap version, just with motion added. The pause changes the read: she walks in, settles, THEN notices the window. That's "a companion exploring the room," not "a waypoint system."

**State-change guard during travel.** If study starts while she's walking to the bookshelf, `buildAnchorVisitBehavior`'s `onSettled` checks `baseState !== 'idle'` and redirects her straight home rather than performing the dwell. Renderers see her walk partway, then turn around — which reads as "she was going to do something but got interrupted," exactly right.

**Reaction interrupts movement immediately.** `react()` and `reactToPetting()` both call `interruptMovement()` before playing the reaction overlay. She snaps to the default centered position. This is preferable to "reaction plays while she's mid-walk to the window" — mid-walk reactions feel glitchy (two competing animations), while snapping to center then reacting feels like she was startled back to attention.

**`position` in snapshot is still null when stationary.** Renderers that already handle `null` (= CSS centered default) don't need any changes. During movement, position updates every ~50ms. Renderers that apply a CSS `transform: translate(x%, y%)` will see smooth updates — no renderer-side changes required.

## Performance Considerations

- `setInterval(50)` only runs during movement. Between visits (cooldowns are 7–12 minutes), zero ticks.
- Each tick calls `this.onChange()` → engine rebuilds snapshot → notifies all listeners. Snapshot rebuild is O(1) (field reads and one `Date.now()` call). Listener notification is O(n) in listener count; typical apps have 1–3 listeners.
- A 1.1–3.2 second movement at 20fps = 22–64 ticks per anchor visit. At 2–4 visits per hour, that's <300 ticks/hour total — negligible.
- `computeMovementDuration` does one `Math.sqrt` call. Called once per visit at build time, not per tick.
- `NavigationController.snapshot()` reads six fields and does one division. Called on every `publish()` (which already happened ~20 times/sec from RoomPresence during active sessions anyway).

## Accessibility Notes

- `position` and `movement` are purely visual fields. Screen readers don't surface them.
- **Reduced-motion compatibility:** The `movement.state`, `movement.direction`, and `movement.progress` fields are semantic; renderers decide whether to animate based on `prefers-reduced-motion`. A reduced-motion renderer can:
  - Read `movement.state === 'arrived'` and snap immediately to the anchor without animating the walk
  - Or ignore `position` entirely and keep Mochi centered
  - NavigationController makes no assumptions about how position is used
- `ARRIVING_PAUSE_MS` (400ms) is below the CSS animation threshold that triggers vestibular issues (typically > 500ms of movement).
- No new ARIA roles, no new content, no new text.

## Future Rive Compatibility

`MovementSnapshot` is pure semantic vocabulary, designed as Rive inputs:

| Field | Rive input type | Usage |
|---|---|---|
| `state: 'walking'` | Boolean trigger | Activate walk cycle blend tree |
| `state: 'arriving'` | Boolean trigger | Trigger head-bob / settle anim |
| `direction: 'left'` | Boolean / enum | Flip rig or blend direction |
| `progress: 0..1` | Number | Scrub walk cycle, scale bounce |

`computeMovementDuration` is exported — a Rive-based renderer can import it to sync Rive timeline scrub duration with actual movement duration, so the walk cycle completes at the same time NavigationController reports `arriving`.

`HOME_POSITION` is exported — a Rive rig that wants to animate the "return to center" can use it as a reference coordinate without hard-coding values.

## Remaining Limitations

- **No actual pathfinding.** Movement is a direct line from origin to destination. If a foreground furniture element sits between HOME_POSITION and `plant {18, 50}`, Mochi appears to walk through it. A future `NavigationController.addWaypoints()` API could handle this without changing the engine's intent model.
- **Fixed HOME_POSITION.** The default layout center is approximated from the room's CSS layout. If the room layout changes (responsive breakpoints, different room scenes), HOME_POSITION may need updating. A future `RoomLayout` module could provide anchor coordinates from the actual rendered DOM, with NavigationController accepting them dynamically.
- **Dead time after interrupted visits.** When a reaction preempts an anchor visit, the anchor-visit behavior slot in BehaviorController remains "current" for the rest of its 11200ms `durationMs` (timers were cleared by `clearIdleTimers`; nothing else fires). This creates a 5–10 second quiet gap before idle behaviors resume. This is arguably desirable (she just reacted, she should settle) but is worth noting as a predictable consequence of using fixed `durationMs` rather than manual behavior completion.
- **Single active movement.** She can only be walking to one destination at a time. Calling `beginMoveTo()` while already moving interrupts the current movement. This is correct for the current anchor-visit system (one visit at a time) but would need rethinking for a future "follow cursor" feature that continuously updates the target.
- **No oscillation prevention at the navigation level.** The brief mentions "prevent repetitive pacing." Oscillation prevention lives entirely in `ObjectAwareness` via per-anchor cooldowns (7–12 min). `NavigationController` contains no anti-oscillation logic — this is correct since oscillation is a behavioral decision (should she go there?), not a movement execution concern. If new behavior sources were added that could generate oscillating movement requests, anti-oscillation would be added at that behavior source, not here.

## Honest Tradeoffs

- **Fixed max `durationMs` vs. computed `durationMs`.** The anchor-visit behavior uses a fixed `VISIT_MAX_MS = 11200` rather than computing the exact round-trip duration from `computeMovementDuration`. This means the behavior slot in BehaviorController is always the same size regardless of how close the anchor is. The tradeoff: simpler code, slight over-allocation of the slot (a visit to the nearby cushion takes ~6s but holds the slot for 11s). Since there's only one anchor visit running at a time and the idle-behavior factory has jitter anyway, this 5-second over-allocation is imperceptible in practice.
- **`interrupt()` snaps to null vs. stays at current position.** When a reaction fires mid-walk, position snaps to null rather than staying at the mid-walk coordinate. The alternative (hold mid-walk position during the reaction) would look like she froze at a random point — less natural than returning to the centered default and reacting from there. The snap is instantaneous and happens at the same frame the reaction overlay starts; in practice it's invisible behind the reaction animation.
- **20fps vs 60fps tick.** 20fps was chosen for minimal overhead. At the slow speeds and short durations involved, the difference from 60fps is imperceptible. If future features require faster, smoother movement (e.g. cursor-following at 60fps), the tick rate can be changed in one line (`TICK_MS = 16`) with no other changes.
