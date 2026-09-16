# Sprint 6.2 — Shared World Interaction & Object Awareness

## New / Modified Files

| File | Status | Description |
|---|---|---|
| `src/features/character/behavior/ObjectAwareness.ts` | **New** | The Object Awareness module |
| `src/features/character/engine/CharacterEngine.ts` | Modified | Composes ObjectAwareness; adds anchor-visit to idle system |
| `src/features/character/behavior/BehaviorController.ts` | Modified | Adds `resetPosition()` |
| `src/features/character/types.ts` | Modified | `ObjectAwarenessSnapshot`, `resetPosition` action, extended anchor union |
| `src/features/character/index.ts` | Modified | Exports new types |

## Architecture Decisions

### Independent Module Composition

`ObjectAwareness` is a fourth independent behavioral module, composed by `CharacterEngine` exactly like `BehavioralMemory`, `RoomPresence`, and `RoutineFamiliarity` already are. It holds its own state (cooldown timestamps, current anchor ID), exposes a single `onChange` callback for snapshot publishing, and knows nothing about the engine's internals. The engine is the composer; `ObjectAwareness` is composed.

The only import from outside `features/character` is `TimeOfDay` from `features/environment/types` — a pure type file, zero runtime coupling. CharacterEngine itself does not import from `features/environment` at all.

### Time-of-Day Awareness Without Engine Coupling

`ObjectAwareness` computes the current time-of-day label internally from `new Date().getHours()` — the same clock-derived approach `EnvironmentEngine` already uses. This keeps both systems independent: the environment doesn't push time into the character feature, and the character feature doesn't pull from `EnvironmentEngine`. Both read the same clock, independently.

### Anchor Visits as Additive Idle Options

Anchor visits are gated by a separate `ANCHOR_VISIT_CHANCE` (15%) that fires **before** the regular idle behavior pool, so they don't dilute the existing pool's budget. The probability chain is:

```
14% → natural pause (unchanged)
15% of remaining → anchor visit check → ObjectAwareness.pickAnchor()
  → null (no eligible anchor) → fall through to regular pool
  → RoomAnchor → buildAnchorVisitBehavior()
remaining → regular idle pool (unchanged)
```

This means anchor visits in practice occur much less than 15% of idle cycles — per-anchor cooldowns (7–12 minutes), the presence-stage guard (blocks during 'active'), and the base-state guard (only 'idle') all narrow the window further. A typical session produces 2–4 natural drifts.

### Three-Phase Anchor Visit

Each anchor visit mirrors the reaction choreography's "notice → do → settle" pattern in the movement domain:

1. **Walk** (`ANCHOR_TRAVEL_MS` = 2600ms) — `moveTo(anchor.position)` sets the position in the snapshot; renderers animate the transition.
2. **Dwell** (`ANCHOR_DWELL_MS` = 3200ms) — once "arrived", push an anchor-appropriate idle overlay from the existing micro-state pool. No new animations: window → `observing-room`/`looking-around`, desk → `looking-around`/`observing-room`, cushion → `yawning`/`stretching`, etc.
3. **Return** — `resetPosition()` restores `position` to null (default layout); `clearCurrentAnchor()` updates the snapshot.

Cleanup (if the behavior is interrupted by a reaction, study start, etc.) always resets position and clears the anchor immediately — no stale state can linger.

### `resetPosition()` — Minimal Surface Expansion

`CharacterActions` gains one new method: `resetPosition()`. This is the minimum addition needed to close anchor visits cleanly — without it, `position` would remain set to the anchor's coordinates indefinitely. It is additive and backward-compatible: no prior code calls it, no prior code needs to change.

`BehaviorController.resetPosition()` sets `this.position = null` and calls `onPositionChange()`, the exact symmetric inverse of `requestMove()`.

### Five Room Anchors

| Anchor | Position | Tags | Preferred Times | Base Weight | Cooldown |
|---|---|---|---|---|---|
| `window` | x:22, y:52 | observing, curious | morning, evening | 8 | 8 min |
| `desk` | x:72, y:52 | studying, curious | morning, afternoon | 6 | 7 min |
| `cushion` | x:40, y:62 | resting | evening, night | 7 | 10 min |
| `bookshelf` | x:78, y:40 | curious, observing | afternoon | 4 | 12 min |
| `plant` | x:18, y:50 | curious | morning, afternoon | 4 | 10 min |

Positions are approximate percentages of the room container — the same coordinate space `CharacterPosition` already defines.

## Behavioral Reasoning

**Why prefer the window at morning/evening?** Real cats and people gravitate toward natural light. Morning and golden-hour light are the most visually interesting — a companion who watches the window at dawn and dusk reads as genuinely present in the room rather than randomly wandering.

**Why prefer the desk during study-adjacent states?** The brief explicitly calls this out: "Occasionally watch the player/study desk while studying." Routine familiarity (from prior sprints) already recognizes study flows; pairing that with a desk-weight multiplier means a player who studies regularly will naturally see Mochi drift toward the desk area over time.

**Why prefer the cushion at evening/night?** Resting behaviors (yawning, stretching) feel more natural after a long day. Evening cushion visits paired with `yawning` create the "she's winding down with you" feeling the brief describes.

**Why block anchor visits during 'active' presence stage?** When the player is actively interacting (feeding, playing, petting), anchor visits would feel like an interruption rather than natural presence. The 'settled' stage and beyond give her "permission to wander" — she's had a moment to sit with the interaction before her attention drifts elsewhere.

## UX Reasoning

**Subtlety by construction**: The probability chain (15% chance → anchor eligibility check → per-anchor cooldown → time-of-day preference) means most idle cycles still produce the existing micro-behaviors. Anchor visits feel discovered rather than scheduled.

**No teleporting**: `moveTo()` sets a position the renderer transitions to; the character visibly moves. This is the same architectural pattern BehaviorController already documents as "a walk is just a Behavior whose run() interpolates requestMove() over time."

**Non-repetitive**: Per-anchor cooldowns (7–12 min) prevent her from returning to the same spot in quick succession. Across a 60-minute session, she might visit each anchor once or twice — never the same place twice in a row.

**Existing behaviors at anchors**: No new animations are needed. Each anchor maps to existing idle micro-states via behavioral tags. The mapping is defined once in `CharacterEngine` (which already owns the micro-state vocabulary), not in `ObjectAwareness` (which stays ignorant of animation/state IDs).

## Performance Considerations

- `ObjectAwareness.pickAnchor()` operates on a fixed 5-element array with a single `Date.now()` call. O(1) in practice. Zero timers of its own — cooldowns are timestamps read lazily, the same "no polling loop" pattern `BehavioralMemory.comfort` already established.
- No new `setInterval` or recurring timers anywhere in this sprint.
- `objectAwareness.snapshot()` returns a plain `{ currentAnchor }` object — one string field. Adding it to `buildSnapshot()` is negligible.
- The two timers inside `buildAnchorVisitBehavior` (arrival + return) are added to the existing `idleTimers` array and cleared by the existing `clearIdleTimers()` call — no separate cleanup path.

## Accessibility Notes

- No UI changes, no new visible elements, no new text, no new ARIA roles.
- Mochi's position change is entirely visual; no content changes that screen readers would surface.
- Reduced-motion: `resetPosition()` and `moveTo()` are semantic state changes — the renderer already gates motion on `prefers-reduced-motion`. Anchor visits when reduced motion is active will update position in the snapshot (the semantic fact that she's "at the window") but the renderer can choose not to animate the transition, consistent with every other motion in the feature.

## Future Rive Compatibility

- `RoomAnchorId` is exported as a pure string union from `ObjectAwareness.ts` — no CSS, no SVG.
- `ObjectAwarenessSnapshot.currentAnchor` is a semantic ID, never an animation name. A Rive rig reads it as a discrete state input alongside `state`, `presence`, and `routineFamiliarity`.
- Anchor position coordinates (x/y percentages) translate directly to Rive layout coordinates without any conversion.
- The behavioral tag vocabulary (`resting`, `observing`, `curious`, `studying`) maps cleanly to Rive state groups or blend-tree categories if future renderers want to express anchor context in animations.

## Remaining Limitations

- **Positions are approximate**: The x/y coordinates for each anchor are percentage estimates based on the room's layered CSS layout. A future sprint that requires precise "standing next to the bookshelf" placement would benefit from a `RoomLayout` module that maps anchor IDs to exact coordinates from the rendered DOM — but the semantic ID (`anchor: 'bookshelf'`) is already in the snapshot, so that future module only needs to map the known IDs, not change the type.
- **No path avoidance**: Movement is direct (one position → another), not path-found. Mochi may visually pass through foreground objects during transitions. Rive physics or a proper path layer would fix this but is out of scope.
- **Sleeping bypasses anchor visits entirely**: `VISIT_ELIGIBLE_STATES` only includes `'idle'`. If a resting-state preference (e.g., sleep near the cushion) is ever wanted, it would require either extending the eligible set or a separate sleep-positioning system.
- **Single anchor at a time**: She can only be at/heading to one anchor. Queueing a second visit while the first is in flight isn't supported — the anchor-visit behavior's `durationMs` covers the full travel + dwell + return window, and the behavior queue's priority system handles the rest.

## Honest Tradeoffs

- **Fixed-probability gate vs. weight-integrated**: Treating anchor visits as a separate pre-pool gate rather than weighting them against the existing idle behaviors means anchor visits never directly displace a habit (stretch, yawn, etc.) — they're truly additive. The tradeoff is that the total "time in micro-behaviors" can increase slightly in sessions with many eligible anchors. In practice the long cooldowns make this imperceptible.
- **Cooldown-only deduplication**: Preventing repetitive visits uses per-anchor cooldowns, not a smarter "visit the least-recently-visited anchor" strategy. This means two adjacent anchors (e.g., `window` and `plant`) could both become eligible at roughly the same time and get visited back-to-back. The per-anchor cooldowns (≥7 min) make this rare in typical play; a priority-queue approach would be more precise but considerably more complex for marginal gain.
- **Time-of-day label granularity**: The four-band label (`morning`/`afternoon`/`evening`/`night`) for anchor preferences is the same granularity `EnvironmentEngine` already uses. A finer-grained preference curve (matching `EnvironmentEngine`'s actual smooth curves) would make anchor attraction vary continuously through the day, but the label-based approach is far simpler and the difference is imperceptible at the timescales anchor cooldowns operate on.

## How Every Major Decision Increases the Illusion of Companionship

| Decision | What it replaces | Why it reads as "she shares the room" |
|---|---|---|
| Five named anchors with semantic positions | A character always stationary in the center | She occupies the room spatially, not just visually |
| Time-of-day preference per anchor | Random or uniform anchor selection | Window at dawn feels intentional, not coincidental |
| Presence-stage guard (no visits during 'active') | Interrupting interactions with wandering | She respects when the player is engaged; wanders when they're not |
| Per-anchor cooldowns | Same spot repeatedly | Her wandering reads as genuine exploration, not a patrol loop |
| Existing behaviors at anchors, no new animations | New idle states tied to furniture | Zero regression risk; the feel is already there, just in a new place |
| `objectAwareness.currentAnchor` in snapshot | Anchor position as invisible internal state | Future renderers can express "at the window" semantically without string-matching |
| Routine familiarity biasing desk/cushion weights | Anchor weights blind to session patterns | A player who studies regularly gradually sees Mochi settle into study-room behavior |
