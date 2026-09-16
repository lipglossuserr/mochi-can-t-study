import type { useRive } from '@rive-app/react-canvas'

type RiveInstance = NonNullable<ReturnType<typeof useRive>['rive']>

/**
 * RiveOverlayController — extracted from RiveCharacterRenderer.tsx this
 * sprint as part of preparing a clean "overlays" extension point: the
 * play/release logic for machine-independent timeline overlays
 * (leftandright/upanddown/Idle 2/orange) no longer lives inline in the
 * render-path switch, so it's reusable, independently testable, and has
 * exactly one place responsible for a timeline's play/pause/stop
 * lifecycle instead of that lifecycle being implicit in call order.
 *
 * One instance per RiveCharacterRenderer mount (held in a ref) — its
 * pending-release bookkeeping is per-instance, matching the one `rive`
 * object it's ever handed.
 *
 * ---- The one-frame black-flash fix (Sprint 6.7), unchanged in substance ----
 * `release()` never calls `rive.stop()` immediately. `stop()` rewinds the
 * released instance's playhead to frame 0; since the artboard is still
 * being advanced every frame by the always-running state machine, that
 * rewind was visible for one frame — a pop to each overlay's frame-0
 * pose (dark/contrasty on some timelines) before the *new* state's
 * visuals took over.
 *
 * `pause()` runs first, synchronously: it halts the instance without
 * resetting its time, so it holds its last (already on-screen) pose —
 * nothing visibly changes the instant this runs. `stop()` is deferred
 * one `requestAnimationFrame` — precision matters here, so to be exact
 * about the timing guarantee (Sprint 6.7A): by the time that callback
 * runs, ownership of Animation State has already synchronously
 * transferred to whatever the new tier/state entry actions are — those
 * run in the very same effect pass as `release()`, before the browser
 * ever paints a frame, not "eventually, probably before this fires."
 * The rAF isn't a race against the new state; it's deliberately one
 * paint *after* the new state has already taken over, so the deferred
 * frame-0 rewind happens behind visuals the new tier is already
 * driving, not in front of them.
 *
 * ---- Sprint 6.7A hardening: no orphaned or double-released overlays ----
 * Two gaps existed in the pre-extraction version, both fixed here:
 *
 *  1. Re-claiming a name before its deferred stop fired. If `release()`
 *     paused `['leftandright']` and, before the next paint, a *second*
 *     transition called `play(['leftandright'])` again (a different
 *     state reusing the same timeline name — this genuinely happens;
 *     see STATE_OVERLAYS), the first release's still-pending `stop()`
 *     would fire after the second `play()` and immediately kill the
 *     timeline that had just been (re)started, presented as a stuck/
 *     frozen overlay. `play()` now cancels any pending release for a
 *     name it's about to reclaim before calling `rive.play()`.
 *  2. Unmounting mid-release. The previous version's `requestAnimationFrame`
 *     handle was never captured, so an unmount between `pause()` and the
 *     scheduled `stop()` left a dangling callback (harmless — wrapped in
 *     try/catch — but not actually released, and not cancellable).
 *     `dispose()` now cancels every still-pending release.
 *
 * Together these guarantee: every paused overlay is eventually released
 * exactly once, never twice, and never after a newer play() has
 * reclaimed the same name — "no paused timelines remain after repeated
 * transitions" holds even under rapid back-to-back state changes.
 */
export class RiveOverlayController {
    private pendingRelease = new Map<string, number>()

    /** Mix extra timelines over the running machine; skip unknown names. */
    play(rive: RiveInstance, available: Set<string>, names: string[]): void {
        const real = names.filter((name) => available.has(name))
        if (real.length === 0) return

        // A name we're reclaiming should never also have a stop() still
        // scheduled against it — cancel that leftover release first.
        for (const name of real) {
            const pending = this.pendingRelease.get(name)
            if (pending !== undefined) {
                cancelAnimationFrame(pending)
                this.pendingRelease.delete(name)
            }
        }

        try {
            rive.play(real)
        } catch {
            /* never let a bad overlay crash the app */
        }
    }

    /** Release overlay timelines — pause immediately, fully stop next frame. See class doc. */
    release(rive: RiveInstance, available: Set<string>, names: string[]): void {
        const real = names.filter((name) => available.has(name))
        if (real.length === 0) return

        try {
            rive.pause(real)
        } catch {
            /* never let overlay cleanup crash the app */
        }

        for (const name of real) {
            const existing = this.pendingRelease.get(name)
            if (existing !== undefined) cancelAnimationFrame(existing)

            const handle = requestAnimationFrame(() => {
                this.pendingRelease.delete(name)
                try {
                    rive.stop([name])
                } catch {
                    /* rive instance may already be torn down by the next frame */
                }
            })
            this.pendingRelease.set(name, handle)
        }
    }

    /** Cancel every still-pending deferred release — call on unmount. */
    dispose(): void {
        this.pendingRelease.forEach((handle) => cancelAnimationFrame(handle))
        this.pendingRelease.clear()
    }
}
