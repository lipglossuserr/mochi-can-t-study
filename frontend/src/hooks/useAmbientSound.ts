import { useEffect, useRef } from 'react'

export type AmbientSoundKind = 'rain' | 'brown-noise' | 'cafe' | 'forest' | 'fireplace' | 'library'

/** Seconds of noise buffer generated once and looped — long enough that the loop point isn't noticeable as a background texture. */
const BUFFER_SECONDS = 6
/** Forest/fireplace bake a handful of "events" (chirps/crackles) into the loop at random positions — a longer buffer keeps those from repeating on an obviously-fixed cadence. */
const LONG_BUFFER_SECONDS = 16

/** White noise in [-1, 1], the raw material every profile below shapes into something specific. */
function makeWhiteNoiseBuffer(ctx: AudioContext, seconds = BUFFER_SECONDS): AudioBuffer {
  const length = ctx.sampleRate * seconds
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1
  }
  return buffer
}

/**
 * Brown noise: a random walk (each sample nudges from the last, then
 * leaked back toward zero so it doesn't drift into silence or clip) —
 * the standard technique for the deep, warm "waterfall"-like texture,
 * much richer than filtered white noise alone.
 */
function makeBrownNoiseBuffer(ctx: AudioContext, seconds = BUFFER_SECONDS): AudioBuffer {
  const length = ctx.sampleRate * seconds
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.5 // compensate for the leaky integrator's natural volume loss
  }
  return buffer
}

/**
 * A handful of short sine "chirp" blips baked directly into an
 * otherwise-quiet buffer at randomized positions/pitches, so a looped
 * buffer alone (no ongoing JS scheduler) can still sound "occasional"
 * rather than a fixed, obviously-looping pattern — the loop point
 * itself is silence in every profile that uses this, so it's inaudible.
 */
function bakeChirps(ctx: AudioContext, buffer: AudioBuffer, count: number, minHz: number, maxHz: number): void {
  const data = buffer.getChannelData(0)
  const chirpSamples = Math.floor(ctx.sampleRate * 0.18)
  for (let c = 0; c < count; c++) {
    const start = Math.floor(Math.random() * (data.length - chirpSamples))
    const freq = minHz + Math.random() * (maxHz - minHz)
    for (let i = 0; i < chirpSamples; i++) {
      // A short, pitch-drifting tone with an attack/decay envelope —
      // more "bird-like" than a flat sine burst.
      const t = i / ctx.sampleRate
      const envelope = Math.sin((Math.PI * i) / chirpSamples) // rises then falls across the burst
      const drift = 1 + 0.3 * Math.sin(t * 40)
      data[start + i] += Math.sin(2 * Math.PI * freq * drift * t) * envelope * 0.5
    }
  }
}

/** Sharp, randomly-timed noise pops with an exponential decay — the standard synthesis trick for a crackling-fire texture. */
function bakeCrackles(ctx: AudioContext, buffer: AudioBuffer, count: number): void {
  const data = buffer.getChannelData(0)
  const maxPopSamples = Math.floor(ctx.sampleRate * 0.05)
  for (let c = 0; c < count; c++) {
    const start = Math.floor(Math.random() * (data.length - maxPopSamples))
    const popSamples = Math.floor(maxPopSamples * (0.3 + Math.random() * 0.7))
    for (let i = 0; i < popSamples; i++) {
      const decay = Math.exp(-i / (popSamples * 0.2))
      data[start + i] += (Math.random() * 2 - 1) * decay * 0.8
    }
  }
}

/**
 * Builds one profile's full audio graph: buffer source (looped) -> a
 * filter chain shaping that profile's character -> gain (fade in/out,
 * final volume) -> destination. Returns the pieces the caller needs to
 * start/stop/fade it; the graph itself is self-contained.
 */
function buildGraph(ctx: AudioContext, kind: AmbientSoundKind) {
  const gain = ctx.createGain()
  gain.gain.value = 0
  gain.connect(ctx.destination)

  if (kind === 'brown-noise') {
    const source = ctx.createBufferSource()
    source.buffer = makeBrownNoiseBuffer(ctx)
    source.loop = true
    // A gentle lowpass keeps it warm rather than buzzy.
    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 600
    source.connect(lowpass)
    lowpass.connect(gain)
    return { source, gain }
  }

  if (kind === 'rain') {
    const source = ctx.createBufferSource()
    source.buffer = makeWhiteNoiseBuffer(ctx)
    source.loop = true
    // Rain reads as a bright, textured hiss — a highpass to strip the
    // low rumble white noise doesn't really have anyway, then a
    // bandpass to give it a "falling water" shimmer rather than flat
    // static.
    const highpass = ctx.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.value = 1200
    const bandpass = ctx.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.frequency.value = 4500
    bandpass.Q.value = 0.6
    source.connect(highpass)
    highpass.connect(bandpass)
    bandpass.connect(gain)
    return { source, gain }
  }

  if (kind === 'cafe') {
    // An honest approximation, not a recording: a low brown-noise
    // murmur bed (the room-tone a cafe has under everything) plus a
    // slowly-modulated mid-band layer roughly in speech's frequency
    // range to suggest distant conversation texture, without
    // pretending to be actual voices.
    const bed = ctx.createBufferSource()
    bed.buffer = makeBrownNoiseBuffer(ctx)
    bed.loop = true
    const bedFilter = ctx.createBiquadFilter()
    bedFilter.type = 'lowpass'
    bedFilter.frequency.value = 400
    const bedGain = ctx.createGain()
    bedGain.gain.value = 0.6

    const murmur = ctx.createBufferSource()
    murmur.buffer = makeWhiteNoiseBuffer(ctx)
    murmur.loop = true
    const murmurFilter = ctx.createBiquadFilter()
    murmurFilter.type = 'bandpass'
    murmurFilter.frequency.value = 1000
    murmurFilter.Q.value = 0.5
    const murmurGain = ctx.createGain()
    murmurGain.gain.value = 0.35
    // Slow random-ish amplitude drift so the "murmur" doesn't sound like
    // a static hiss — an LFO modulating the murmur layer's own gain.
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.15
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.15
    lfo.connect(lfoGain)
    lfoGain.connect(murmurGain.gain)
    lfo.start()

    bed.connect(bedFilter)
    bedFilter.connect(bedGain)
    bedGain.connect(gain)
    murmur.connect(murmurFilter)
    murmurFilter.connect(murmurGain)
    murmurGain.connect(gain)

    // Two sources share one logical "start/stop" — wrap them so the
    // caller doesn't need to know cafe is secretly two layers.
    const source = {
      start: () => {
        bed.start()
        murmur.start()
      },
      stop: () => {
        bed.stop()
        murmur.stop()
        lfo.stop()
      },
    }
    return { source, gain }
  }

  if (kind === 'forest') {
    // Wind bed (brighter/airier bandpass than cafe's murmur) with a
    // handful of soft, pitch-drifting chirps baked into the buffer —
    // see bakeChirps' own comment for why baking beats a live scheduler
    // for something this lightweight.
    const buffer = makeBrownNoiseBuffer(ctx, LONG_BUFFER_SECONDS)
    bakeChirps(ctx, buffer, 5, 1800, 3200)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const windFilter = ctx.createBiquadFilter()
    windFilter.type = 'bandpass'
    windFilter.frequency.value = 900
    windFilter.Q.value = 0.4
    source.connect(windFilter)
    windFilter.connect(gain)
    return { source, gain }
  }

  if (kind === 'fireplace') {
    // Warm low murmur (the fire's steady burn) plus sharp, randomly-
    // timed crackle pops baked into the same buffer — see bakeCrackles.
    const buffer = makeBrownNoiseBuffer(ctx, LONG_BUFFER_SECONDS)
    bakeCrackles(ctx, buffer, 10)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const warmth = ctx.createBiquadFilter()
    warmth.type = 'lowpass'
    warmth.frequency.value = 500
    source.connect(warmth)
    warmth.connect(gain)
    return { source, gain }
  }

  // 'library' — the quietest profile: heavily low-passed brown noise,
  // deliberately muffled/distant rather than textured, since a library's
  // whole character IS the near-absence of sound. gain.gain is set
  // relative to VOLUME at play-time below, same as every other profile;
  // this one just reads as quieter because the filter removes far more
  // of the signal, not because it's treated specially.
  const source = ctx.createBufferSource()
  source.buffer = makeBrownNoiseBuffer(ctx)
  source.loop = true
  const hush = ctx.createBiquadFilter()
  hush.type = 'lowpass'
  hush.frequency.value = 220
  source.connect(hush)
  hush.connect(gain)
  return { source, gain }
}

const FADE_SECONDS = 1.2
const VOLUME = 0.18 // deliberately quiet — background texture, not foreground audio

/**
 * Plays a synced ambient co-working sound. `kind` is null for silence
 * (the room's default). `enabled` is the LISTENER's own personal
 * on/off — independent of what the room picked, since not everyone
 * studying together necessarily wants background sound even if the
 * host set one, same reasoning as a personal mic mute existing
 * alongside a host force-mute. `volume` is the listener's own personal
 * level, 0..1, multiplied onto the profile's base `VOLUME` ceiling
 * (never boosted past it) — defaults to 1 (the full, already-quiet
 * ceiling) so existing call sites that don't pass it are unaffected.
 */
export function useAmbientSound(kind: AmbientSoundKind | null, enabled: boolean, volume = 1) {
  const ctxRef = useRef<AudioContext | null>(null)
  const graphRef = useRef<{ source: { stop: () => void }; gain: GainNode } | null>(null)
  const targetGain = VOLUME * Math.min(1, Math.max(0, volume))

  useEffect(() => {
    // Tear down whatever's currently playing, fading out rather than
    // hard-cutting, whenever the target sound changes (including to
    // null/disabled). Deliberately NOT keyed on `volume` (see the
    // separate effect below) — a slider drag should smoothly retarget
    // the currently-playing graph's gain, not fade the whole thing out
    // and rebuild it on every tick.
    const activeGraph = graphRef.current
    const activeCtx = ctxRef.current
    if (activeGraph && activeCtx) {
      const now = activeCtx.currentTime
      activeGraph.gain.gain.cancelScheduledValues(now)
      activeGraph.gain.gain.setValueAtTime(activeGraph.gain.gain.value, now)
      activeGraph.gain.gain.linearRampToValueAtTime(0, now + FADE_SECONDS)
      const graphToStop = activeGraph
      window.setTimeout(() => {
        try {
          graphToStop.source.stop()
        } catch {
          // The AudioContext may already be closed by now (e.g. the
          // user left the room mid-fade) — nothing to clean up in that
          // case, closing the context already released everything.
        }
      }, FADE_SECONDS * 1000 + 100)
      graphRef.current = null
    }

    if (!kind || !enabled) return

    // AudioContext creation must happen in response to a user gesture
    // in most browsers — this hook is only ever mounted from within an
    // already-interactive room page (the user already clicked "join"
    // to get here), so this reliably succeeds rather than needing its
    // own explicit "click to enable audio" step.
    const ctx = ctxRef.current ?? new AudioContext()
    ctxRef.current = ctx
    if (ctx.state === 'suspended') void ctx.resume()

    const graph = buildGraph(ctx, kind)
    graph.source.start()
    const now = ctx.currentTime
    graph.gain.gain.setValueAtTime(0, now)
    graph.gain.gain.linearRampToValueAtTime(targetGain, now + FADE_SECONDS)
    graphRef.current = graph

    return () => {
      // Effect cleanup on unmount (leaving the room) — hard stop is
      // fine here since the whole page is going away, no need to fade.
      graph.gain.disconnect()
      try {
        graph.source.stop()
      } catch {
        // Already stopped by the fade-out path above — harmless.
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- targetGain intentionally excluded; see the volume-only effect below.
  }, [kind, enabled])

  // Volume-only retarget: adjusts the already-playing graph's gain
  // smoothly (a short ramp, not a fade-out/rebuild) whenever the
  // listener moves their personal volume slider. No-ops if nothing is
  // currently playing — the next kind/enabled change picks up the
  // latest targetGain via the closure above.
  useEffect(() => {
    const graph = graphRef.current
    const ctx = ctxRef.current
    if (!graph || !ctx) return
    const now = ctx.currentTime
    graph.gain.gain.cancelScheduledValues(now)
    graph.gain.gain.setValueAtTime(graph.gain.gain.value, now)
    graph.gain.gain.linearRampToValueAtTime(targetGain, now + 0.3)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately only re-runs on volume; kind/enabled changes are handled by the effect above.
  }, [targetGain])

  useEffect(() => {
    return () => {
      void ctxRef.current?.close()
    }
  }, [])
}
