# Sprint 6.5 — Procedural Daily Life & Autonomous Routine

## Files Added

| File | Description |
|---|---|
| `src/features/character/behavior/DailyRoutine.ts` | The Daily Routine module — decides which autonomous activity to initiate |

## Files Modified

| File | Changes |
|---|---|
| `src/features/character/engine/CharacterEngine.ts` | Composes `DailyRoutine` as the 7th module; adds jittered scheduling timer and `buildDailyActivityBehavior()` |
| `src/features/character/behavior/ObjectAwareness.ts` | Adds `getAnchor(id)` method so CharacterEngine can look up a specific anchor by ID |
| `src/features/character/types.ts` | Adds `DailyRoutineSnapshot` interface; adds `dailyRoutine` field to `CharacterSnapshot` |
| `src/features/character/index.ts` | Exports `DailyRoutineSnapshot` and `DailyActivityId` for renderer consumers |

---

## Architecture Decisions

### Independent Module Composition

`DailyRoutine` is a seventh independent behavioral module composed by `CharacterEngine` exactly like `BehavioralMemory`, `RoomPresence`, `RoutineFamiliarity`, `ObjectAwareness`, `NavigationController`, and `RelationshipBond` already are — same constructor-injected `onChange` callback pattern, same snapshot contract, same lazy state. It holds its own cooldown state (per-kind timestamps, global last-activity timestamp, current activity ID), exposes one decision method (`pickActivity()`), and knows nothing about the engine's internals.

### Decision vs. Scheduling Separation

`DailyRoutine.pickActivity()` is a pure decision function. It does not set timers, call behaviors, or move Mochi. CharacterEngine owns the scheduling (a jittered `setTimeout` chain firing every ~3 minutes ±25%) and all execution (mapping the returned `DailyActivity` to `buildAnchorVisitBehavior()` or `buildIdleBehavior()`). This matches the existing pattern: `ObjectAwareness.pickAnchor()` decides; CharacterEngine builds and submits the behavior.

### Jittered Timer, Not Fixed Interval

The `DAILY_ROUTINE_TICK_MS` (3 minutes) is jittered ±25% on each cycle, so autonomous activities never arrive at a predictable cadence. With per-kind cooldowns (6–15 minutes) and a 2-minute global cooldown, a 30-minute passive session produces ~3–6 natural moments — rare enough to feel organic, present enough to make the room feel lived-in.

### Activities Use Only Existing Vocabulary

Every daily activity maps to existing anchor IDs (from `ObjectAwareness`) and existing micro-behavior IDs (already in `CharacterEngine`). No new state-machine states, no new animations, no new overlay IDs. `buildDailyActivityBehavior()` wraps the existing `buildAnchorVisitBehavior()` and `buildIdleBehavior()` methods with a cleanup callback that clears `dailyRoutine.currentActivity` when the behavior ends — the minimum surgical addition.

### `getAnchor(id)` on ObjectAwareness

`DailyRoutine.resolveActivity()` returns an anchor ID (a string), not a `RoomAnchor` object. CharacterEngine needs to look up the full anchor data (position, tags, cooldownMs) to call `buildAnchorVisitBehavior()`. The minimal addition is `ObjectAwareness.getAnchor(id: RoomAnchorId): RoomAnchor | null` — a single-line lookup against the module-level `ROOM_ANCHORS` array. No state is added; no existing code changes.

### Priority: Same as Idle Micro-Behaviors

Daily activities are submitted to `BehaviorController` at priority 1, identical to all idle micro-behaviors. Any reaction (eating, playing, petting, celebrating) carries priority 10–30 and immediately preempts them. A study-session start changes `baseState` to `'studying'`, gating `tryInitiateDailyActivity()` at the engine level before anything reaches `DailyRoutine.pickActivity()`. Existing interruption rules are unchanged; daily activities are just another idle-tier behavior.

### `active` Presence Stage Always Blocked

`pickActivity()` returns `null` whenever `presenceStage === 'active'`. The "active" stage means the player is engaging with Mochi in real time — autonomous initiation during active engagement would compete with, not complement, the player's experience. The block is in `DailyRoutine`, not `CharacterEngine`, so the reasoning is collocated with the cooldown and stage logic.

### Initial Delay Before First Check

`startDailyRoutineTimer()` uses an initial delay of 90 seconds before the first autonomous check. This prevents Mochi from immediately starting autonomous activities the moment the app loads — the room should feel settled and the player oriented before she begins living her own life.

---

## Behavioral Reasoning

### Signal Stack Ordering

The seven behavioral modules now form a complete signal stack, each operating at a longer timescale than its predecessors:

```
BehavioralMemory   — "what just happened?" (seconds → minutes)
RoomPresence       — "how active has the session been?" (minutes)
RoutineFamiliarity — "does this flow feel familiar?" (minutes → hours)
ObjectAwareness    — "which room object to visit?" (position, instant)
NavigationController — "how does she move?" (mechanics, instant)
RelationshipBond   — "how deep is the connection?" (hours)
DailyRoutine       — "what autonomous life should she live?" (minutes → session)
```

`DailyRoutine` sits at the session timescale: it reads signals from all the others and composes them into a high-level intention that CharacterEngine executes through the lower timescale systems.

### "Bias, Never Force" Contract

`DailyRoutine` follows the same contract as every other module: its weights are multiplicative nudges, never hard gates. The same activity can emerge at an "unexpected" time if the other signals align — a high-comfort, bonded companion might initiate a window-watching session in the afternoon, not just the morning, because all her internal signals point that way. This prevents the system from feeling like a schedule.

### Activity-to-Signal Mapping

| Activity | Strongest biasing signal |
|---|---|
| watching-window | Morning/evening time + settled stage |
| resting | Evening/night time + quiet stage + high comfort |
| exploring | Morning/afternoon time + settled stage + low bond |
| observing-player | Active/settled stage + high bond + petted afterglow |
| quiet-thinking | Evening/night time + deep-quiet stage + routine familiarity |
| stretching | Any time + settled stage + played afterglow |
| desk-moment | Morning/afternoon time + routine familiarity |

### Anchor Cooldown Interaction

`DailyRoutine` does NOT attempt to bypass `ObjectAwareness` per-anchor cooldowns. When a daily activity targets an anchor (e.g. `watching-window` → `window`), CharacterEngine calls `buildAnchorVisitBehavior()` which calls `objectAwareness.recordVisit(anchor.id)` — the standard path. If `DailyRoutine` requests an anchor that `ObjectAwareness` would also have on cooldown, the anchor visit proceeds with the anchor's own cooldown refreshed. The DailyRoutine per-kind cooldown operates independently above the anchor system, so both layers gate appropriately.

---

## UX Reasoning

### Why "Never Appear Scripted or Repetitive"

The combination of jittered timers (±25%), per-kind cooldowns (6–15 minutes), signal-weighted randomization, and the existing anchor cooldowns in `ObjectAwareness` means that even with 7 possible activity kinds, no two sessions will produce the same sequence. A 60-minute passive watch might produce: [window → resting → desk-moment → observing] on one day and [stretching → quiet-thinking → exploring → window] on another — same Mochi, different life.

### Why Long Cooldowns

Per the brief: "Support long periods where Mochi simply enjoys sharing the room without seeking attention." Long cooldowns (6–15 min/kind, 2 min global minimum) ensure the default experience is Mochi *being present* — not Mochi *constantly doing things*. The idle micro-behavior system (8–15 sec between behaviors) already provides the "alive in the moment" texture; daily routine provides the "she has a day" texture, at a much slower pace.

### Smooth Blending with Existing Behaviors

Daily activities submit to `BehaviorController` at the same priority as idle micro-behaviors, so they queue and interleave seamlessly. From the renderer's perspective, there is no observable difference between an idle `stretching` micro-behavior and a daily-routine `stretching` — the only distinction is the `dailyRoutine.currentActivity` snapshot field, which renderers can optionally read for Rive inputs but need not respond to.

---

## Performance Considerations

- **One extra timer**: A single `setTimeout` chain in CharacterEngine, firing every ~3 minutes. Zero `setInterval`, zero `requestAnimationFrame`.
- **Negligible per-call cost**: `pickActivity()` iterates a fixed 7-element array with simple arithmetic. No DOM access, no external calls, no allocation beyond the return object.
- **Zero idle overhead**: Between checks, DailyRoutine does nothing. Cooldowns are timestamps checked lazily at call time, the same idiom as `BehavioralMemory.comfort` and `RoutineFamiliarity.level`.
- **No re-render budget change**: The `dailyRoutine.currentActivity` field changes at most once per activity (~3–10 minute intervals). This is negligible relative to the engine's existing publish frequency.

---

## Accessibility Notes

- **Reduced-motion**: All four movement-based activities (`watching-window`, `resting`, `exploring`, `desk-moment`) are excluded when `prefers-reduced-motion: reduce` is active. Non-movement activities (`observing-player`, `quiet-thinking`, `stretching`) remain eligible, preserving ambient presence without triggering motion.
- **No new announcements**: Daily activities produce no ARIA announcements, notifications, or UI state changes. Renderers that want to announce Mochi's activities must opt in explicitly by reading `dailyRoutine.currentActivity`.
- **No attention demands**: Per the brief, no timers, pop-ups, or notifications are shown. The system is purely cosmetic/ambient — players are never required to respond to a daily activity.

---

## Future Rive Compatibility

`DailyRoutineSnapshot.currentActivity` is pure semantic vocabulary — a string enum ID, never a CSS class, animation name, or implementation detail. A future Rive rig maps it to a discrete String/enum state input alongside the existing snapshot fields (state, phase, bond, etc.) with no changes required in this module or CharacterEngine.

The seven activity IDs form a stable vocabulary contract:
```
'watching-window' | 'resting' | 'exploring' | 'observing-player'
| 'quiet-thinking' | 'stretching' | 'desk-moment'
```

Adding new activities in a future sprint requires only:
1. A new `DailyActivityId` union member
2. A new `ActivitySpec` entry in `ACTIVITY_SPECS`
3. A new `case` in `resolveActivity()`

No CharacterEngine changes are required unless the new activity needs a behavioral path that doesn't exist yet.

---

## Remaining Limitations

- **No persistence**: Like every other behavioral signal in this system, daily routine state resets on page reload. A future sprint could persist the global and per-kind cooldown timestamps to `localStorage` so Mochi doesn't "forget" she just visited the window 2 minutes before a reload.
- **No inter-activity sequencing**: Activities are chosen independently each cycle. A future "micro-narrative" system could weight toward activities that logically follow the previous one (e.g., resting after watching the window → a natural flow). This is architecturally easy to add (a `lastActivityId` field in `pickActivity` opts) but outside Sprint 6.5 scope.
- **No room-layout awareness**: Anchor positions are still fixed percentages, not adapted to viewport shape or room zoom level. Sprint 6.3's NavigationController note about this limitation still applies.
- **No player-absence detection**: DailyRoutine does not detect whether the player tab is backgrounded or the window minimized. A future sprint could pause the timer when `document.hidden` is true, preventing accumulated activity bursts on tab restore.

---

## Honest Tradeoffs

- **2-minute global cooldown is a guess.** The brief says "never appear scripted or repetitive" and "long periods where Mochi simply enjoys sharing the room." 2 minutes felt right empirically, but a real calibration pass with real users might shift it to 90 seconds or 3 minutes.
- **`ObjectAwareness` anchor cooldowns are not respected before a daily activity is submitted.** DailyRoutine picks an activity kind and anchor ID without checking `ObjectAwareness` cooldowns (it can't — those are private). In the rare case that DailyRoutine targets an anchor that's still on `ObjectAwareness` cooldown from a recent idle visit, `ObjectAwareness.recordVisit()` still fires, resetting that anchor's cooldown to now. The net effect is a slightly shorter gap until the next visit to that anchor — acceptable given how long both cooldowns are.
- **No `'active'` stage activities.** The brief mentions "observe the player" as an activity, but the module blocks all initiations during the `'active'` presence stage. The rationale: if the player is actively interacting, Mochi's reactions to those interactions are already handled by the existing event system. Adding autonomous initiation on top risks competing with those reactions. `observing-player` is instead eligible during `'settled'` stage — the moment just after active engagement, when Mochi might naturally glance over. This is a deliberate conservative choice; it can be revisited if the "active stage block" feels too restrictive.
