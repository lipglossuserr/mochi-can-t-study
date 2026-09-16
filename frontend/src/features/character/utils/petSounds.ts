/**
 * petSounds — a small family of synthesized reaction sounds for
 * PettableCharacter, same technique and honesty as
 * `features/rooms/utils/meow.ts` (a sibling of this file, not a
 * duplicate — that one is scoped to chat/community delight moments;
 * this one is scoped to actually touching Mochi). No audio files, no
 * network fetch: everything here is generated directly with the Web
 * Audio API at call time. Cartoon sound-effect shapes, not realistic
 * recordings — intentional, matches the illustrated-not-photographic
 * style everywhere else in this app.
 */

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioContextCtor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextCtor) return null
  if (!audioContext) {
    audioContext = new AudioContextCtor()
  }
  return audioContext
}

function ensureRunning(ctx: AudioContext) {
  if (ctx.state === 'suspended') void ctx.resume()
}

/**
 * A tiny, high "mrrp?" blip for a single tap/boop — quicker and
 * lighter than playMeow's full "me-ow" shape, so rapid taps don't
 * sound like the same longer sound overlapping itself. No rate-limit
 * here (unlike meow.ts) — PettableCharacter already rate-limits
 * boop-triggering at the gesture level (TAP_MAX_DURATION_MS etc.), so
 * a second limiter here would just be redundant.
 */
export function playBoopChirp(): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    ensureRunning(ctx)

    const start = ctx.currentTime
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'

    oscillator.frequency.setValueAtTime(700, start)
    oscillator.frequency.exponentialRampToValueAtTime(1050, start + 0.05)

    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.14, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.13)

    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.15)
  } catch {
    // Sound is decoration, never a dependency — swallow and move on.
  }
}

/**
 * A quick 3-note giggle for the "tickle" escalation (several rapid
 * taps in a row — see PettableCharacter's TICKLE_TAP_THRESHOLD).
 * Three short rising blips in quick succession reads as a laugh
 * without needing anything as complex as formant synthesis.
 */
export function playTickleGiggle(): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    ensureRunning(ctx)

    const start = ctx.currentTime
    const notes = [660, 780, 900]
    notes.forEach((freq, i) => {
      const noteStart = start + i * 0.09
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = 'triangle'
      oscillator.frequency.setValueAtTime(freq, noteStart)
      gain.gain.setValueAtTime(0.0001, noteStart)
      gain.gain.exponentialRampToValueAtTime(0.13, noteStart + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.09)
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start(noteStart)
      oscillator.stop(noteStart + 0.1)
    })
  } catch {
    // Sound is decoration, never a dependency — swallow and move on.
  }
}

/**
 * A short surprised "hup!" — a quick downward blip, distinct enough
 * from the boop chirp (which rises) to read as a different emotion.
 * Reserved for genuine "oh!" moments (see the Konami-code and
 * midnight-study easter eggs) rather than routine interaction, same
 * "sometimes, not constant" discipline meow.ts documents for itself.
 */
export function playSurprise(): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    ensureRunning(ctx)

    const start = ctx.currentTime
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(500, start)
    oscillator.frequency.exponentialRampToValueAtTime(260, start + 0.12)

    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.1, start + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16)

    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.18)
  } catch {
    // Sound is decoration, never a dependency — swallow and move on.
  }
}
