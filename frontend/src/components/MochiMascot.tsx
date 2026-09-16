import { useCallback, useRef, useState, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import PetSpeechBubble from '@/features/pet/components/PetSpeechBubble'

interface SparkleParticle {
  id: number
  dx: number
  dy: number
  glyph: string
}

const SPARKLE_GLYPHS = ['✦', '♡', '⋆', '✧']
const GREETINGS = [
  'Hehe~ ♡',
  'Boop!',
  "Let's study!",
  'Tehee ♡',
  'Mochi mochi~',
  'Yay, hi!',
  '✦ ✧ ✦',
]
const SPARKLE_COUNT = 8
const SPARKLE_LIFETIME_MS = 800

/**
 * MochiMascot
 *
 * The landing page's hand-drawn mochi character. She breathes gently
 * on her own, but she's also touchable: hover makes her perk up with
 * happy eyes and a wider smile, and a click/tap gives her a joyful
 * squish, a burst of sparkles, and a one-line greeting — the same
 * "boop" language used by the interactive pet elsewhere in the app,
 * so she reads as the same character even here on her static SVG form.
 */
function MochiMascot() {
  const [isHovered, setIsHovered] = useState(false)
  const [isBooped, setIsBooped] = useState(false)
  const [sparkles, setSparkles] = useState<SparkleParticle[]>([])
  const [line, setLine] = useState<string | null>(null)
  const idRef = useRef(0)
  const squishTimeout = useRef<number | null>(null)

  const handleBoop = useCallback(() => {
    setIsBooped(true)
    if (squishTimeout.current) window.clearTimeout(squishTimeout.current)
    squishTimeout.current = window.setTimeout(() => setIsBooped(false), 420)

    const burst: SparkleParticle[] = Array.from({ length: SPARKLE_COUNT }, () => {
      const angle = Math.random() * Math.PI * 2
      const distance = 30 + Math.random() * 26
      return {
        id: idRef.current++,
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        glyph: SPARKLE_GLYPHS[Math.floor(Math.random() * SPARKLE_GLYPHS.length)],
      }
    })
    setSparkles((current) => [...current, ...burst])
    window.setTimeout(() => {
      setSparkles((current) => current.filter((p) => !burst.some((b) => b.id === p.id)))
    }, SPARKLE_LIFETIME_MS)

    setLine(GREETINGS[Math.floor(Math.random() * GREETINGS.length)])
  }, [])

  return (
    <motion.button
      type="button"
      onClick={handleBoop}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileTap={{ scale: 0.95 }}
      aria-label="Say hi to Mochi"
      className="group relative mx-auto h-36 w-36 cursor-pointer touch-none select-none rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-taro/30 sm:h-44 sm:w-44"
      animate={{
        y: [0, -12, 0],
        rotate: isHovered ? [0, -4, 4, 0] : 0,
      }}
      transition={{
        y: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' },
        rotate: { duration: 0.6, ease: 'easeInOut' },
      }}
    >
      <motion.div
        className={`h-full w-full ${isBooped ? 'character-boop' : ''}`}
        animate={{
          scaleX: [1, 1.035, 0.975, 1],
          scaleY: [1, 0.965, 1.025, 1],
        }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-xl transition-transform duration-300 group-hover:scale-105">
          <defs>
            <radialGradient id="mochiBody" cx="35%" cy="28%" r="80%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="55%" stopColor="#FBEFF6" />
              <stop offset="100%" stopColor="#F0D9EA" />
            </radialGradient>
          </defs>

          {/* top knot, characteristic of a tied mochi bun */}
          <ellipse cx="100" cy="38" rx="15" ry="13" fill="url(#mochiBody)" />

          {/* body */}
          <ellipse cx="100" cy="114" rx="86" ry="76" fill="url(#mochiBody)" />

          {/* blush cheeks, a touch brighter on hover — she's happy to see you */}
          <ellipse
            cx="57"
            cy="122"
            rx="13"
            ry="8.5"
            fill="#F0A8BE"
            opacity={isHovered ? 0.9 : 0.7}
            className="transition-opacity duration-300"
          />
          <ellipse
            cx="143"
            cy="122"
            rx="13"
            ry="8.5"
            fill="#F0A8BE"
            opacity={isHovered ? 0.9 : 0.7}
            className="transition-opacity duration-300"
          />

          {/* eyes: soft curved "happy" arcs on hover, dots otherwise */}
          <g>
            {isHovered ? (
              <>
                <path d="M69 106 Q76 98 83 106" stroke="#382C3E" strokeWidth="5" strokeLinecap="round" fill="none" />
                <path d="M117 106 Q124 98 131 106" stroke="#382C3E" strokeWidth="5" strokeLinecap="round" fill="none" />
              </>
            ) : (
              <>
                <circle cx="76" cy="104" r="5" fill="#382C3E" />
                <circle cx="124" cy="104" r="5" fill="#382C3E" />
              </>
            )}
          </g>

          {/* smile — widens a little on hover */}
          <path
            d={isHovered ? 'M82 122 Q100 140 118 122' : 'M85 124 Q100 136 115 124'}
            stroke="#382C3E"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </motion.div>

      {sparkles.length > 0 && (
        <div className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
          {sparkles.map((particle) => (
            <span
              key={particle.id}
              className="boop-particle absolute left-1/2 top-1/2 select-none text-base text-taro"
              style={
                {
                  '--boop-dx': `${particle.dx}px`,
                  '--boop-dy': `${particle.dy}px`,
                } as CSSProperties
              }
            >
              {particle.glyph}
            </span>
          ))}
        </div>
      )}

      <PetSpeechBubble message={line} autoHideMs={1000} className="-top-3 -right-4 sm:-right-6" />
    </motion.button>
  )
}

export default MochiMascot
