# Mochi Rive asset

Drop the real animation file here as:

    public/mochi.riv

**Sprint 6.6 update:** the file's internal State Machine
(`PetStateMachine`, described in earlier revisions of this README) does
not drive its animations reliably and is out of scope to repair. The
active renderer (`HybridCharacterRenderer`, see
`src/features/character/renderers/hybrid/`) never touches the State
Machine — it plays the confirmed-working named timelines below
directly, and builds everything else procedurally.

## Confirmed working timelines (play these directly by name)

| Timeline name | Use |
|---|---|
| `orange`, `white`, `calico`, `Black` | Skin/color variants (cosmetic, static; note `Black` is capitalized) |
| `Fokus_lvl_1` / `Fokus_lvl_2` / `Fokus_lvl_3` | Studying, low/medium/high intensity |
| `Break` | Resting / sleepy / comfort |
| `Break Ending` | Exit-rest transition |
| `Timeline 1` | Look left/right — idle glance, object-awareness look |
| `fishSpawn` / `fishSpawn_off` | Play trigger enter/release |
| `App Launch` | Boot animation, first mount only |

Everything else in the file (`Blink`, `eating`, `Food_area_hit_*`,
`upanddown`, `leftandright`, `idle_gate`, the 2D blend circle) is
unconfirmed or non-functional — `RiveClipPlayer.playClip()` refuses to
play anything not in this table (see `CONFIRMED_RIVE_CLIPS`) and warns
instead. The full state→clip mapping lives in
`src/features/character/renderers/hybrid/StateToClipMap.ts` — extend
that table when Sprint 6.7's Synfig assets arrive, rather than this
README's old State Machine contract.

If the asset is missing or fails to load, the renderer falls back to
`LivingMochiRenderer` (Sprint 5's hand-drawn illustration), unchanged.
