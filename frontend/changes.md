# Sprint 6.0 — Emotional Anticipation & Shared Routine

**Internal sprint documentation — Mochi character behavior/rendering layer**
**Status:** Implemented, compiles clean (`tsc -b` / `tsc --noEmit`), builds clean
(`vite build`), no regressions to 5.3B/5.4/5.5.

---

## Executive Summary

5.3B gave Mochi a memory of what just happened. 5.4 gave her a sense of the room's
rhythm. 5.5 polished how all of that gets expressed through motion. None of those
three sprints gave her anything resembling a sense of *pattern* — every session looked
identical to her, structurally, whether the player fed-then-played every single time or
did something different each visit. Sprint 6.0 adds exactly one new question to her
internal model, and no more: *does this interaction feel familiar based on recent
sessions?*

That question is answered by a new, small, fully independent module —
`RoutineFamiliarity` — that notices when one interaction tends to follow another
(Study → Pet, Feed → Play, and so on), lets that noticing strengthen gradually with
repetition, and lets it fade on its own the moment a pattern stops recurring. It never
stores more than a handful of numbers, never surfaces anything to the player, and never
decides what happens next — it only ever nudges the probabilities that 5.3B, 5.4, and
5.5 already compute. The result is meant to be felt exactly once, cumulatively, as: "she
seems to know how we usually spend time together" — never noticed as a feature, a
percentage, or a prediction.

Nothing from 5.3B–5.5 was redesigned. `BehavioralMemory`, `RoomPresence`, and
`CharacterStateMachine` are all unmodified in structure; `BehavioralMemory` gained one
optional, backward-compatible parameter on a method it already had, and nothing else in
this codebase needed to change shape at all to make room for the new module.

---

## Files Added

- `src/features/character/behavior/RoutineFamiliarity.ts` — the new, independent
  routine-recognition signal. See Architecture Decisions below for why it's a fourth
  module and not folded into an existing one.

## Files Modified

- `src/features/character/types.ts` — added `RoutineFamiliaritySnapshot` and a
  `routineFamiliarity` field on `CharacterSnapshot`, deliberately separate from
  `RoomPresenceSnapshot`.
- `src/features/character/behavior/BehavioralMemory.ts` — `record()` gained one
  optional parameter, `boost` (default `1`, fully backward compatible with every
  existing call site). `BehavioralMemory` itself still has zero knowledge of
  `RoutineFamiliarity`'s existence — the engine is the one composing the two.
- `src/features/character/engine/CharacterEngine.ts` — owns a `RoutineFamiliarity`
  instance alongside `memory`/`presence`; records an interaction on every
  feed/play/pet/celebrate *and* (newly) on study; feeds `routine.level` into idle
  weighting, ambient-thought category bias, and `BehavioralMemory`'s new comfort-growth
  boost. No public method signatures changed beyond the one already-optional
  `BehavioralMemory.record` parameter.
- `src/features/character/renderers/types.ts` — added an optional
  `routineFamiliarity` prop to `CharacterRendererProps`, mirroring `afterglow`/
  `presence`.
- `src/features/character/react/Character.tsx` — forwards `routineFamiliarity` from
  the snapshot to whichever renderer is active.
- `src/features/character/renderers/RiveCharacterRenderer.tsx` — forwards
  `routineFamiliarity` to the `LivingMochiRenderer` fallback (no Rive-specific mapping
  needed — familiarity never changes which *state* she's in, only how existing states
  are weighted/rendered).
- `src/features/character/renderers/LivingMochiRenderer.tsx` — the renderer polish:
  softer micro-saccades and steadier breathing amplitude when familiar, a calmer/more
  confident anticipation pose, a touch longer + slightly warmer observation moments,
  and a small extra contribution to plain-idle's existing duration combination. All
  timing/amplitude tweaks on existing primitives — no new SVG markup.
- `src/features/character/index.ts` — exports `RoutineFamiliaritySnapshot` from the
  feature's public API.

**Untouched, as required:** `RoomPresence`, `CharacterStateMachine`,
`BehaviorController`'s queue/priority/cooldown/timer logic, `GazeController`'s public
surface, the event bus, all reaction choreography and timings, idle-behavior
weighting's existing afterglow/presence terms (only extended, not changed), ambient
thought categories' existing lines and base weights, the Rive renderer's state-mapping
table, `HomeRoomPage`, `RoomScene`, backend/API/auth/save/persistence.

---

## Behavioral Design Decisions

### A. One Question, Answered by One Number

The brief is explicit: "Routine Familiarity should answer one question only." The
entire public surface of `RoutineFamiliarity` reflects that literally — one getter,
`level`, returning one number in `[0, 1]`. There's no exposed history, no list of
"known routines," no confidence breakdown per pattern. Every consumer (idle weighting,
ambient thoughts, the renderer, `BehavioralMemory`'s comfort boost) reads the exact same
single value. This is a stricter constraint than `RoomPresenceSnapshot` (which exposes
two fields, `stage` and `activityLevel`) or `CharacterSnapshot.afterglow` (`kind` +
`phase`) — deliberately so, since this sprint's brief asked for exactly one question,
not a small family of related ones.

### B. Recognizing Sequences Without Storing Them

"Gradually learns recurring interaction sequences... never stores large histories" is
satisfied structurally, not by a pruning policy. The vocabulary of interaction kinds is
fixed and small — fed, played, petted, celebrated, studied (five kinds) — so the space
of possible "what tends to follow what" pairs is fixed too: at most 5×5 = 25 entries,
ever. There's no cap to enforce and no eviction logic to get wrong, because the map
that stores learned transitions literally cannot grow past 25 keys no matter how long a
session runs. A three-step sequence like the brief's own "Study → Pet → Feed" example
isn't stored as its own unit at all — it emerges from two strong pairwise transitions
(Study→Pet and Pet→Feed) recognized independently, the same way a real habit is really
just a chain of "this usually follows that" rather than one memorized script.

### C. Two Timescales, Mirroring `BehavioralMemory`'s Own Relationship

`RoutineFamiliarity` exposes one number, but internally it's built from two decay
rates, deliberately modeled on the relationship `BehavioralMemory.dominant` (fast) and
`.comfort` (slow) already have with each other:

- **Learned transition strength** (`LEARNED_DECAY_HALFLIFE_MS`, 6 hours) — how
  established a specific pair (e.g. "petted then fed") has become. This is "slowly
  forgets routines that stop happening": a pattern that used to recur but hasn't in a
  while quietly loses strength every time anything reads it, with no scheduled
  cleanup required.
- **Recent glow** (`RECENT_GLOW_HALFLIFE_MS`, ~100 seconds) — how familiar the
  *transition that just happened* felt, fading over roughly a couple of minutes. This
  is `level`, the one thing every consumer actually reads.

An interaction that continues a well-established pattern produces a strong, slow-fading
learned entry AND refreshes the fast-fading glow to a high value — so the *moment*
right after a familiar flow reads as noticeably (if subtly) different, while the
*pattern itself* persists quietly in the background across many such moments.

### D. Recording "Studied" — the One New Call Site

The brief's own example sequence ("Study → Pet → Feed") can't be recognized at all if
studying is never recorded as an event anywhere — and previously it wasn't: the `study`
action went straight to `this.stateMachine.setBase('studying')` with no behavioral
bookkeeping whatsoever, unlike feed/play/pet/celebrate which all flow through
`BehavioralMemory`/`RoomPresence`. This sprint adds exactly one line to that action:
`this.routine.recordInteraction('studied')`. It deliberately does NOT also wire study
into `BehavioralMemory`'s afterglow or `RoomPresence`'s quiet/active tracking — that
would be expanding 5.3B/5.4's scope, not 6.0's, and studying isn't obviously an
"afterglow-worthy" pleasant interaction the way feeding/petting/celebrating are. This
sprint's footprint on existing behavior is exactly one new line, not a re-plumbing of
what studying means to the rest of the system.

### E. Familiar Flows Settle Idle Habits, They Don't Replace Them

Extending `weighFor()` (5.3B/5.4's existing habit-weighting function) with a third
bias source: a recognized recent flow makes `ambient-thought` and `observing-room` a
touch more likely and `curiosity-pause` a touch less likely — read together, "she
settles into it more naturally" (the brief's own phrase) rather than staying on
alert. Multipliers here are deliberately smaller than the equivalent afterglow/presence
terms (0.3–0.5× vs. up to 1.6× elsewhere) since this is the newest, least-tested signal
in the system and the brief's own emphasis is "subtle enough that users feel it rather
than consciously notice it."

### F. Ambient Thoughts Lean Content, Not Curious, When Familiar

`pickAmbientThought()` gained the same kind of third bias term: familiarity nudges the
category draw toward `contentment` and `comfort`, away from `curiosity` — a companion
who's used to the flow of a session is less likely to be struck by something novel and
more likely to just feel good about where she is. The line chosen within a category is
still a plain random pick, exactly as 5.4 established — familiarity only ever shifts
which *category* comes up, never which specific line.

### G. Comfort Grows Faster When the Path There Was Familiar

The brief's "comfort growth speed (slightly)" is implemented as a single multiplier
passed into `BehavioralMemory.record()`'s new optional `boost` parameter:
`1 + 0.4 * routine.level`, so a fully-familiar transition grows comfort up to 40%
faster than an unfamiliar one, capped modestly on purpose ("slightly," per the brief).
Recording the routine transition happens immediately before this call, so the boost
reflects the freshly-updated familiarity of the interaction that's happening right now
— a nice small compounding effect (a familiar flow both feels good on its own AND helps
her settle in a little quicker) without requiring `BehavioralMemory` to know why.

### H. Anticipation Reads as Confidence, Not Repetition

The brief's "idle transitions feel more confident" and the renderer bullet "anticipation
poses" both point at the same idea: a companion who recognizes what's coming next
doesn't brace for it the same way a companion encountering something less familiar
does. `anticipationConfidence` (a small multiplier, `1 − 0.3 × level`) dampens the
anticipation pose's lean-in amplitude — layered on top of, never replacing, Sprint
5.5's own per-occurrence pose variance, so a familiar anticipation still varies
occurrence-to-occurrence, it's just centered on a calmer baseline.

---

## Renderer Polish

Every change below is an amplitude or duration tweak on existing 5.4/5.5 mechanisms —
no new SVG markup, no new keyframes, no new CSS.

- **Softer eye movement** — the micro-saccade magnitude (5.5) is scaled down by up to
  50% when familiarity is high, read from a ref inside the existing ambient-timer
  closure so no new effect or dependency array was needed.
- **Breathing consistency** — the breathing-amplitude jitter range (5.5) narrows
  toward its center (1.0) by up to 40% when familiar, the same "steadier, not
  duller" idea applied to the other half of 5.5's ambient physiology.
- **More confident anticipation** — see Design H above; a smaller, calmer lean-in for
  a recognized upcoming interaction.
- **Slightly more relaxed plain-idle posture** — `routineLevel` is folded into the
  same `Math.max(...)` combination that already blends afterglow and room-presence
  influences on plain-idle's breathing duration (5.4), taking the calmest of all three
  rather than stacking them.
- **Warmer, slightly longer observation moments** — `observing-room`'s hold duration
  (5.4) extends by up to 0.4s and the cheek blush opacity gets a small (+0.06 max) lift
  when a familiar routine is behind the pause — "warmer," never a new pose, never a
  dramatic change.

---

## UX Reasoning

The brief's target line — "Mochi seems to know how we usually spend time together" —
is a claim about *feel*, not about any single visible behavior, which is why nothing in
this sprint has a single standout moment the way 5.4's `observing-room` did. Every
change here is a small percentage shift on a probability that was already there.
That's deliberate: a companion who visibly announces "I recognize this pattern!" reads
as a productivity tool wearing a friendly face — a notification with cute framing. A
companion who just... settles a little faster, thinks slightly warmer thoughts, and
leans in a little less nervously when the room's rhythm feels familiar reads as
something that's actually been paying attention, the same distinction a real pet or
person draws between "reciting your schedule back to you" and "just seeming
comfortable because it knows the routine."

## Technical Reasoning

`RoutineFamiliarity` reuses two idioms this codebase already established rather than
inventing new ones: the bounded, lazily-decayed `(value, timestamp)` pattern
`BehavioralMemory.comfort` introduced in 5.4, applied twice (once for the slow learned
map, once for the fast recent glow); and the "only publish when something crosses a
meaningful threshold" restraint `RoomPresence` established for its own stage
transitions. Nothing new had to be invented at the module level — the work here is
almost entirely in choosing what small number to compute and where to apply it, not in
building new infrastructure.

## Architecture Decisions

- **A fourth independent module, not a merge.** The brief is explicit that this must
  not be merged into `BehavioralMemory`, `RoomPresence`, or `CharacterStateMachine`.
  `RoutineFamiliarity` is constructed and composed by `CharacterEngine` exactly the way
  `BehavioralMemory` and `RoomPresence` already are — its own file, its own
  constructor-injected `onChange`, zero imports of or references to the other two
  modules. The one place they touch is inside `CharacterEngine` itself, which is
  already the composition root for all of them.
- **`BehavioralMemory` gained a parameter, not a dependency.** Rather than have
  `BehavioralMemory` import `RoutineFamiliarity` to compute its own boost (which would
  be the "merge" the brief prohibits), `record()` just accepts a generic multiplier
  the caller supplies. `BehavioralMemory` has no idea a `RoutineFamiliarity` exists —
  it just grew a knob any caller could use, and `CharacterEngine` is the only caller
  that currently does.
- **Bounded storage is structural, not policy-based.** See Design B. This was a
  deliberate design choice over the alternative (an LRU-evicted map with an explicit
  cap) specifically because the brief calls out "never stores large histories" as a
  hard requirement — a fixed, small vocabulary makes that provably true rather than
  true-until-someone-changes-a-constant.
- **`routineFamiliarity` is its own `CharacterSnapshot` field, not folded into
  `presence`.** Even though both are "ambient bias signals" conceptually, keeping them
  as separate fields mirrors keeping them as separate classes — a consumer that only
  cares about routine familiarity doesn't need to reach through `presence` to find it,
  and the two can evolve independently.

## Performance Considerations

- **Zero new timers.** Both of `RoutineFamiliarity`'s decay rates are lazy,
  computed-at-read-time exponentials exactly like `BehavioralMemory.comfort` — no
  `setInterval`, no scheduled pruning, no polling of any kind.
- **Storage cost is a fixed, tiny upper bound.** At most 25 map entries, each a
  `{ value: number, updatedAt: number }` pair — a trivial, constant memory footprint
  regardless of session length.
- **Publishes are rare by construction.** `recordInteraction()` only calls `onChange`
  the moment familiarity crosses from "not noticeable" to "noticeable" (mirroring
  `RoomPresence`'s own restraint) — a long, unbroken run of already-familiar
  interactions doesn't force a fresh publish each time.
- **Renderer-side reads cost nothing extra.** The new ambient-timer dampening reads a
  single ref already being written every render (`routineLevelRef.current = ...`); no
  new subscriptions, no new effects, no new per-frame work in the 60fps gaze loop —
  everything Sprint 6.0 touches there lives in the already-sparse ambient-timer
  callbacks from 5.5.
- **The one new call site (`study`) costs one method call.** `recordInteraction()`
  is O(1): a map lookup, a decay computation, and possibly one map write.

## Accessibility Considerations

- Every renderer-side change in this sprint routes through mechanisms already gated by
  `prefers-reduced-motion` in 5.3A-2/5.5 — the ambient-timer effect (saccade/breath-amp
  dampening) is inside the same effect already gated by
  `if (reduced || prefersReducedMotion()) return`, and the anticipation/observation
  duration and amplitude tweaks are ordinary number changes inside the same ternary
  branches reduced-motion already collapses via `reduced ? { y: 0 } : ...`.
  Reduced-motion users see none of this sprint's motion changes, not a toned-down
  version of them.
- Nothing here is essential to using the app. As with every prior sprint's additions,
  routine familiarity is pure decoration layered on an already-fully-functional
  Feed/Play/Study/Pet/Celebrate loop; a player who never notices any of this sprint's
  changes loses nothing.
- No new text, ARIA roles, or live regions were introduced — ambient thought category
  bias changes which *category* of line might appear, still delivered through the
  existing `PetSpeechBubble` (`role="status"`, `aria-live="polite"`) exactly as before.

## Future Rive Compatibility

`RoutineFamiliaritySnapshot` is pure semantic vocabulary in `types.ts` — one number,
no mention of SVG, CSS, or Framer Motion anywhere in `RoutineFamiliarity.ts` or the
engine's weighting code. `RiveCharacterRenderer` already threads `routineFamiliarity`
through as an optional prop, exactly the same forward-compatible shape 5.4 set up for
`presence`. Notably, familiarity never changes *which* state the character is in —
only how existing states are weighted and how the existing SVG renderer's timing
responds — so a future Rive rig doesn't need a new state or a new mapping table entry
at all; it would simply read `routineFamiliarity.level` as one more continuous input
into whatever secondary-motion or timing blend tree it already has for
afterglow/presence.

## Remaining Limitations

- All of `RoutineFamiliarity`'s in-memory state resets on page reload, exactly like
  every other behavioral signal in this feature (`BehavioralMemory`, `RoomPresence`).
  The brief's own constraints ("no persistence beyond appropriate local behavioral
  state," "no backend") make this the correct scope for this sprint, but it does mean
  "recent sessions" in the brief's framing really means "earlier in this same browser
  session" rather than genuinely across visits — a true multi-day routine memory would
  need actual persistence, which is explicitly out of scope here.
- The fixed five-kind vocabulary (fed/played/petted/celebrated/studied) is what makes
  storage provably bounded, but it also means familiarity can only ever be as granular
  as "which of five broad kinds happened," never (for example) "the player usually
  feeds Mochi right after opening the app" — no time-of-day or session-boundary
  awareness exists in this model at all.
- `SESSION_GAP_MS` (20 minutes) and both decay half-lives are hand-picked constants
  tuned by feel, the same way every prior sprint's timing constants were — there's no
  analytical basis for these specific numbers, just the same "small, restrained,
  plausible" philosophy applied consistently.
- Familiarity currently only recognizes bigram-style "A then B" transitions; it never
  explicitly rewards a full three-step chain more than the sum of its two pairs (see
  Design B). This was an intentional simplification, but it does mean a genuinely
  distinctive three-step ritual gets no more "credit" than two independently-common
  pairs that happen to chain together.

## Honest Tradeoffs

- Bigram-only recognition (Design B) trades precision for the structural
  boundedness the brief explicitly asked for. A trigram-or-longer model could
  recognize richer routines, but would need either a growing key space (violating
  "never stores large histories") or a fixed-size eviction cache (adding real
  complexity for a "pure polish"-adjacent sprint). Pairwise transitions were judged
  good enough to produce the felt effect the brief describes, at a fraction of the
  complexity.
- Adding a `boost` parameter to `BehavioralMemory.record()` is a small, real expansion
  of that class's public surface, even though it's optional and backward compatible.
  The alternative — computing the boosted comfort value entirely inside
  `CharacterEngine` and writing to some new `BehavioralMemory` setter — was judged
  worse: it would mean `BehavioralMemory` losing control of its own invariant (comfort
  is always the lazily-decayed result of increments passed to `record`), which
  `record(kind, boost)` preserves.
- This sprint's bias multipliers (0.3–0.5× on idle weights, 0.3–0.5× on ambient-thought
  category weights, up to 0.4× on comfort growth, up to 0.3× on anticipation
  amplitude) are all smaller than the equivalent 5.4 terms for the same slots. This was
  a deliberate, conservative choice given the brief's heavy emphasis on subtlety for a
  brand-new signal, at the cost of the effect being genuinely hard to notice in a short
  play session — by design, but worth naming as a real tradeoff against
  discoverability/testability.
- Recording `study` into `RoutineFamiliarity` but nowhere else (Design D) is a
  narrower, more conservative choice than fully integrating studying into
  `BehavioralMemory`/`RoomPresence` the way feed/play/pet/celebrate already are. That
  broader integration might well be worth doing, but it wasn't this sprint's brief,
  and the one-line, single-purpose addition here keeps 6.0's footprint on existing
  systems as close to zero as this feature could get while still making the brief's own
  example sequence recognizable at all.

## How Every Major Decision Increases the Illusion of Companionship

| Decision | What it replaces | Why it reads as "she knows our routine" |
|---|---|---|
| Bigram routine recognition | Every session structurally identical to her | Recurring flows (Feed→Play, Study→Pet) start to feel like *her* habits too, not just the player's |
| Two-timescale familiarity (learned vs. recent glow) | An all-or-nothing "remembered" flag | Patterns build up gradually and fade gradually — exactly how real familiarity actually forms and erodes |
| Idle habits settle when familiar | Idle behavior blind to session-level pattern | She visibly relaxes into a flow she recognizes, the way a companion who's "done this before" would |
| Ambient thoughts lean content when familiar | Thought category blind to pattern | Her inner monologue reflects comfort with routine, not just the moment's mood |
| Comfort grows faster on familiar flows | A flat, pattern-blind comfort-growth rate | Doing the things you usually do together visibly means a little more to her than doing something new |
| Calmer, more confident anticipation | Identical anticipation regardless of context | She doesn't brace the same way for something she's used to — recognition reads as ease |
| Warmer, longer observation after familiar chains | Observation moments blind to what led into them | Even her quiet, unprompted moments carry a trace of "we've had a good little routine going" |

Every one of these nudges an existing probability by a small amount; none of them
introduces a new mechanic, a new number the player can see, or a new decision Mochi
makes on the player's behalf. That restraint is the entire point of the brief, and this
sprint's only real addition is teaching her, quietly, to notice what keeps happening.
