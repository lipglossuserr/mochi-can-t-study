import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AmbientSoundKind } from '@/hooks/useAmbientSound'

interface VibeMeta {
  key: AmbientSoundKind
  emoji: string
  label: string
  /**
   * Fully-static Tailwind class strings — NOT built via template-literal
   * interpolation (e.g. `${accent}/40`), since Tailwind's build-time
   * class scanner only picks up literal strings it can find verbatim in
   * source; an interpolated class name would silently never make it
   * into the compiled CSS at all.
   */
  idleClass: string
  selectedClass: string
}

const VIBES: VibeMeta[] = [
  { key: 'rain', emoji: '🌧️', label: 'Rain', idleClass: 'bg-sky-100/40 hover:bg-sky-100', selectedClass: 'bg-sky-100' },
  { key: 'brown-noise', emoji: '🌊', label: 'Brown noise', idleClass: 'bg-blush-light/40 hover:bg-blush-light', selectedClass: 'bg-blush-light' },
  { key: 'cafe', emoji: '☕', label: 'Cafe murmur', idleClass: 'bg-butter/40 hover:bg-butter', selectedClass: 'bg-butter' },
  { key: 'forest', emoji: '🌲', label: 'Forest', idleClass: 'bg-matcha-light/40 hover:bg-matcha-light', selectedClass: 'bg-matcha-light' },
  { key: 'fireplace', emoji: '🔥', label: 'Fireplace', idleClass: 'bg-orange-100/40 hover:bg-orange-100', selectedClass: 'bg-orange-100' },
  { key: 'library', emoji: '📚', label: 'Quiet library', idleClass: 'bg-taro-light/40 hover:bg-taro-light', selectedClass: 'bg-taro-light' },
]

/** Small, purely-decorative motion per vibe — see globals.css's "Vibe picker" section for what each class actually animates. Not audio-reactive (no AnalyserNode plumbing), just a fixed loop per sound kind so the card reads as alive at a glance. */
function VibeDecoration({ vibeKey }: { vibeKey: AmbientSoundKind }) {
  switch (vibeKey) {
    case 'rain':
      return (
        <div className="relative h-5 w-8" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="vibe-drip absolute top-0 h-3 w-px bg-sky-500/70"
              style={{ left: `${i * 12}px`, animationDelay: `${i * 0.3}s` }}
            />
          ))}
        </div>
      )
    case 'fireplace':
      return <span aria-hidden="true" className="vibe-flicker text-lg">🔥</span>
    case 'forest':
      return <span aria-hidden="true" className="vibe-sway inline-block text-lg">🌿</span>
    case 'cafe':
      return (
        <div className="relative h-5 w-4" aria-hidden="true">
          {[0, 1].map((i) => (
            <span
              key={i}
              className="vibe-rise absolute bottom-0 h-2 w-0.5 rounded-full bg-ink/25"
              style={{ left: `${i * 6}px`, animationDelay: `${i * 0.8}s` }}
            />
          ))}
        </div>
      )
    case 'library':
      return <span aria-hidden="true" className="vibe-breathe text-lg">📖</span>
    case 'brown-noise':
      return (
        <div className="vibe-shimmer h-4 w-8 rounded-full bg-sky-200/60" aria-hidden="true" />
      )
    default:
      return null
  }
}

/** The small pulsing-bars "now playing" indicator shown on the trigger button while a sound is actually audible to this listener. */
function NowPlayingBars() {
  return (
    <span className="flex h-3 items-end gap-[2px]" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="vibe-eq-bar block w-[3px] rounded-full bg-current"
          style={{ height: '100%', animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  )
}

interface VibePickerProps {
  activeSound: AmbientSoundKind | null
  isHost: boolean
  enabled: boolean
  volume: number
  onToggleEnabled: () => void
  onVolumeChange: (volume: number) => void
  onSelectSound: (sound: AmbientSoundKind | null) => void
}

/**
 * VibePicker
 *
 * Replaces the old inline toolbar cluster (a plain mute button + a
 * volume slider + a `<select>`) with one trigger that opens a proper
 * card grid. Functionally identical underneath — same
 * onSelectSound/onToggleEnabled/onVolumeChange contract the page
 * already had wired to useAmbientSound and setAmbientSound — this is
 * purely a visual/interaction upgrade.
 */
function VibePicker({
  activeSound,
  isHost,
  enabled,
  volume,
  onToggleEnabled,
  onVolumeChange,
  onSelectSound,
}: VibePickerProps) {
  const [open, setOpen] = useState(false)
  const activeMeta = VIBES.find((v) => v.key === activeSound) ?? null
  const audible = enabled && activeSound !== null

  return (
    <div className="relative">
      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Room vibe / ambient sound"
        className={`flex items-center gap-2 rounded-full px-4 py-2 font-body text-xs font-semibold shadow transition-colors ${
          audible ? 'bg-taro text-white hover:bg-taro-dark' : 'bg-white/80 text-ink/70 hover:bg-blush-light'
        }`}
      >
        <span aria-hidden="true">{activeMeta ? activeMeta.emoji : '🎵'}</span>
        {activeMeta ? activeMeta.label : 'Vibe'}
        {audible && <NowPlayingBars />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* Click-outside-to-close catcher — same trick as this page's
                other popovers/modals: a full-viewport transparent layer
                behind the panel, since there's no existing focus-trap/
                portal utility in this codebase to reuse instead. */}
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 z-20 w-72 rounded-[1.75rem] border border-white/60 bg-cream p-4 shadow-[0_20px_55px_-18px_rgba(224,112,158,0.4)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-body text-xs font-semibold uppercase tracking-widest text-ink/45">
                  Room vibe
                </span>
                <button
                  type="button"
                  onClick={onToggleEnabled}
                  aria-pressed={enabled}
                  title={enabled ? 'Mute for yourself' : 'Unmute'}
                  className="font-body text-xs font-semibold text-ink/50 hover:text-ink/80"
                >
                  {enabled ? '🔊 On' : '🔇 Off'}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {isHost && (
                  <button
                    type="button"
                    onClick={() => onSelectSound(null)}
                    className={`flex flex-col items-center gap-1 rounded-2xl border p-2.5 transition-all ${
                      activeSound === null
                        ? 'border-taro bg-taro/10 shadow-[0_0_0_3px_rgba(224,112,158,0.15)]'
                        : 'border-transparent bg-white/70 hover:bg-blush-light'
                    }`}
                  >
                    <span className="text-lg" aria-hidden="true">🔇</span>
                    <span className="font-body text-[10px] font-medium text-ink/60">None</span>
                  </button>
                )}
                {VIBES.map((vibe) => {
                  const selected = activeSound === vibe.key
                  return (
                    <motion.button
                      key={vibe.key}
                      type="button"
                      whileHover={isHost ? { scale: 1.05 } : undefined}
                      whileTap={isHost ? { scale: 0.95 } : undefined}
                      disabled={!isHost}
                      onClick={() => onSelectSound(vibe.key)}
                      title={isHost ? vibe.label : `${vibe.label} — only the host can change this`}
                      className={`flex flex-col items-center gap-1 rounded-2xl border p-2.5 transition-colors ${
                        selected
                          ? `border-taro ${vibe.selectedClass} shadow-[0_0_0_3px_rgba(224,112,158,0.15)]`
                          : `border-transparent ${vibe.idleClass}`
                      } ${!isHost ? 'cursor-default opacity-70' : ''}`}
                    >
                      <VibeDecoration vibeKey={vibe.key} />
                      <span className="font-body text-[10px] font-medium text-ink/70">{vibe.label}</span>
                    </motion.button>
                  )
                })}
              </div>

              {!isHost && (
                <p className="mt-2 font-body text-[10px] text-ink/40">Only your host can change the room's vibe.</p>
              )}

              {audible && (
                <label className="mt-3 flex items-center gap-2 rounded-full bg-white/70 px-3 py-2">
                  <span aria-hidden="true" className="text-xs">🔈</span>
                  <span className="sr-only">Your personal volume</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={(event) => onVolumeChange(Number(event.target.value))}
                    className="h-1.5 flex-1 accent-taro"
                  />
                </label>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default VibePicker
