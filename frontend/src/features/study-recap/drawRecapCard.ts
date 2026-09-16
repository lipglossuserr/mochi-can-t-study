/**
 * drawRecapCard — pure rendering: given a 2D canvas context and a
 * plain data object, paints one finished recap card. No React, no DOM
 * queries beyond the context itself, no network — this is a straight
 * port of the app's own design tokens (see globals.css's `@theme`
 * block, whose hex values are copied below verbatim rather than read
 * live, since a canvas has no CSS variable resolution of its own) into
 * `CanvasRenderingContext2D` calls, so it's trivially testable and
 * reusable from anywhere a recap might someday be generated (a share
 * button today; conceivably a scheduled "your week in review" later).
 */

// Copied from globals.css's @theme block — see that file if the
// palette ever changes; there's no live CSS-variable read from a
// canvas context, so this needs to be kept in sync by hand.
const COLORS = {
  taro: '#e0709e',
  taroDark: '#bd4f7e',
  taroLight: '#f7cadd',
  matcha: '#8fbf8a',
  matchaLight: '#cde7c9',
  blushLight: '#fbd9e6',
  cream: '#fff4f8',
  petal: '#ffe7f1',
  ink: '#4b2e3d',
  berry: '#b2486f',
  butter: '#fff0d9',
} as const

/** Emoji per equipped skin (see Pet.equippedSkin / SkinItemKey) — no illustration asset needed, matches the app's existing emoji-forward tone (shop fallback icons, nav emoji, etc). */
const SKIN_EMOJI: Record<string, string> = {
  'skin-orange': '🐱',
  'skin-calico': '🐈',
  'skin-white': '🐈\u200d⬛', // deliberately the ZWJ black-cat sequence for contrast against orange, not a literal "white cat" glyph — none exists in the standard emoji set
}

export interface RecapCardData {
  petName: string
  equippedSkin: string
  /** 0-100, or null if the session had no camera data — mirrors StudySession.focusScore exactly. */
  focusScore: number | null
  /** Reuses `formatDuration`'s own MM:SS/HH:MM:SS format for consistency with the summary screen this is shared from, e.g. "47:12" — deliberately not reformatted into "47m 12s" here. */
  studyTimeLabel: string
  currentStreak: number
  classification: 'VALID' | 'PARTIAL' | 'INVALID'
  /** e.g. "Feb 14, 2026" — reuses the caller's own date formatting rather than this module picking a locale. */
  dateLabel: string
}

const CLASSIFICATION_COPY: Record<RecapCardData['classification'], { headline: string; accent: string }> = {
  VALID: { headline: 'Beautiful session!', accent: COLORS.matcha },
  PARTIAL: { headline: 'Good effort today', accent: COLORS.butter },
  INVALID: { headline: 'Every start counts', accent: COLORS.blushLight },
}

const WIDTH = 1080
const HEIGHT = 1350

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Renders the finished card onto `canvas` (must already be WIDTH×HEIGHT — see `RECAP_CARD_SIZE`). */
export function drawRecapCard(canvas: HTMLCanvasElement, data: RecapCardData): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { headline, accent } = CLASSIFICATION_COPY[data.classification]

  // ---- background ----
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT)
  bg.addColorStop(0, COLORS.cream)
  bg.addColorStop(0.55, COLORS.petal)
  bg.addColorStop(1, COLORS.blushLight)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // soft decorative circles, echoing the app's own "ambient blob" motif
  ctx.globalAlpha = 0.35
  ctx.fillStyle = COLORS.taroLight
  ctx.beginPath()
  ctx.arc(WIDTH - 120, 140, 220, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = COLORS.matchaLight
  ctx.beginPath()
  ctx.arc(80, HEIGHT - 160, 180, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  // ---- wordmark ----
  ctx.fillStyle = COLORS.ink
  ctx.font = '600 44px "Fredoka", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('🍡 Mochi', 72, 120)
  ctx.font = '600 26px "Plus Jakarta Sans", sans-serif'
  ctx.fillStyle = `${COLORS.ink}99`
  ctx.fillText('Study Recap', 72, 158)

  // ---- pet skin badge ----
  const emoji = SKIN_EMOJI[data.equippedSkin] ?? '🐱'
  ctx.textAlign = 'right'
  ctx.font = '80px sans-serif'
  ctx.fillText(emoji, WIDTH - 72, 150)

  // ---- classification headline ----
  roundedRect(ctx, 72, 210, WIDTH - 144, 64, 32)
  ctx.fillStyle = accent
  ctx.fill()
  ctx.fillStyle = COLORS.ink
  ctx.font = '600 28px "Fredoka", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(headline, WIDTH / 2, 253)

  // ---- big focus score ----
  const scoreCenterY = 520
  ctx.beginPath()
  ctx.arc(WIDTH / 2, scoreCenterY, 210, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.globalAlpha = 0.7
  ctx.fill()
  ctx.globalAlpha = 1

  if (data.focusScore !== null) {
    ctx.fillStyle = COLORS.taroDark
    ctx.font = '700 160px "Fredoka", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(String(data.focusScore), WIDTH / 2, scoreCenterY + 55)
    ctx.font = '600 32px "Plus Jakarta Sans", sans-serif'
    ctx.fillStyle = `${COLORS.ink}99`
    ctx.fillText('focus score', WIDTH / 2, scoreCenterY + 105)
  } else {
    ctx.fillStyle = `${COLORS.ink}80`
    ctx.font = '600 40px "Plus Jakarta Sans", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('no camera data', WIDTH / 2, scoreCenterY + 10)
  }

  // ---- stat row: study time + streak ----
  const rowY = 830
  const colWidth = (WIDTH - 144) / 2
  const drawStat = (x: number, label: string, value: string) => {
    roundedRect(ctx, x, rowY, colWidth - 16, 160, 28)
    ctx.fillStyle = '#ffffffb3'
    ctx.fill()
    ctx.fillStyle = COLORS.ink
    ctx.font = '700 52px "Fredoka", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(value, x + colWidth / 2 - 8, rowY + 88)
    ctx.font = '600 24px "Plus Jakarta Sans", sans-serif'
    ctx.fillStyle = `${COLORS.ink}99`
    ctx.fillText(label, x + colWidth / 2 - 8, rowY + 124)
  }
  drawStat(72, 'study time', data.studyTimeLabel)
  drawStat(72 + colWidth, 'day streak', `${data.currentStreak} 🔥`)

  // ---- footer ----
  ctx.font = '600 26px "Plus Jakarta Sans", sans-serif'
  ctx.fillStyle = `${COLORS.ink}80`
  ctx.textAlign = 'center'
  ctx.fillText(`${data.petName} was there the whole time ♡`, WIDTH / 2, 1080)
  ctx.font = '500 22px "Plus Jakarta Sans", sans-serif'
  ctx.fillStyle = `${COLORS.ink}60`
  ctx.fillText(data.dateLabel, WIDTH / 2, 1120)
}

export const RECAP_CARD_SIZE = { width: WIDTH, height: HEIGHT }
