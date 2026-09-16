/**
 * A short, synthesized "meow" chirp for the cat-themed UI (Community Rooms, Study Rooms) — no audio
 * file to fetch (this sandbox has no network access to source one
 * anyway), so this generates the sound directly with the Web Audio
 * API: a sine oscillator whose pitch rises then falls over ~220ms,
 * shaped by a quick-attack/decay gain envelope. It reads as a cute
 * cartoon "mew" chirp, not a realistic cat recording — that's
 * intentional, it matches Mochi's illustrated-not-photographic style
 * everywhere else.
 * <p>
 * Deliberately NOT wired to every interaction — per the brief this
 * should be "sometimes," not constant, so callers should reserve it
 * for genuine positive moments (joining a community, sending a first
 * chat message, an upvote landing) rather than every click. A session
 * rate-limit below is a second backstop against accidental spam if a
 * caller does hook it up somewhere too eager.
 */

let audioContext: AudioContext | null = null
let lastPlayedAt = 0
const MIN_INTERVAL_MS = 900

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextCtor) return null
  if (!audioContext) {
    audioContext = new AudioContextCtor()
  }
  return audioContext
}

/**
 * Plays a short synthesized meow. Safe to call from any click handler
 * — browsers require a user gesture before audio can play, and every
 * intended call site (a button's onClick) already is one. Fails
 * silently on anything else (unsupported browser, autoplay policy
 * quirk, etc.) since a missing sound effect should never break the
 * actual action it's celebrating.
 */
export function playMeow(): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = performance.now()
    if (now - lastPlayedAt < MIN_INTERVAL_MS) return
    lastPlayedAt = now

    if (ctx.state === 'suspended') {
      void ctx.resume()
    }

    const start = ctx.currentTime
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'

    // Pitch: quick rise then a gentle fall — the "me-ow" shape.
    oscillator.frequency.setValueAtTime(520, start)
    oscillator.frequency.exponentialRampToValueAtTime(880, start + 0.07)
    oscillator.frequency.exponentialRampToValueAtTime(430, start + 0.22)

    // Volume: fast attack, short hold, soft decay — a chirp, not a drone.
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.16, start + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24)

    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.26)
  } catch {
    // Sound is decoration, never a dependency — swallow and move on.
  }
}
