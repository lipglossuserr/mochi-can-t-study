import { motion } from 'framer-motion'
import type { PetState } from '../types/pet'

/**
 * MochiFallback
 *
 * Stands in for the real Rive animation until the .riv asset exists.
 * Reacts to the same three states RivePet supports, in the same
 * hand-drawn style as the app's existing MochiMascot, so the dashboard
 * looks intentional rather than broken while art is pending.
 *
 * Not part of the public API — RivePet is the only component that
 * should ever render this.
 */
function MochiFallback({ state }: { state: PetState }) {
  const isStudying = state === 'STUDYING'
  const isCelebrating = state === 'CELEBRATING'
  const isHappy = state === 'HAPPY'

  return (
    <motion.div
      className="relative mx-auto h-full w-full"
      animate={
        isCelebrating
          ? { y: [0, -22, 0, -12, 0], scaleX: [1, 0.95, 1.05, 0.97, 1], scaleY: [1, 1.08, 0.94, 1.04, 1] }
          : isHappy
            ? { y: [0, -14, 0, -8, 0], rotate: [0, -4, 4, -2, 0] }
            : { y: [0, -12, 0], scaleX: [1, 1.035, 0.975, 1], scaleY: [1, 0.965, 1.025, 1] }
      }
      transition={{
        duration: isCelebrating ? 1.1 : isHappy ? 0.9 : isStudying ? 5.2 : 4.2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      aria-hidden="true"
    >
      {isCelebrating && (
        <>
          <span className="sparkle absolute -top-2 left-2 text-lg text-taro">✦</span>
          <span
            className="sparkle absolute -top-4 right-4 text-lg text-blush"
            style={{ animationDelay: '0.3s' }}
          >
            ✦
          </span>
          <span
            className="sparkle absolute top-6 right-0 text-base text-rosegold"
            style={{ animationDelay: '0.6s' }}
          >
            ✦
          </span>
        </>
      )}

      {isHappy && (
        <>
          <span className="sparkle absolute -top-3 left-6 text-base text-blush">♡</span>
          <span
            className="sparkle absolute -top-1 right-2 text-sm text-rosegold"
            style={{ animationDelay: '0.4s' }}
          >
            ♡
          </span>
        </>
      )}

      <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-xl">
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

        {/* blush cheeks */}
        <ellipse cx="57" cy="122" rx="13" ry="8.5" fill="#F0A8BE" opacity="0.7" />
        <ellipse cx="143" cy="122" rx="13" ry="8.5" fill="#F0A8BE" opacity="0.7" />

        {/* eyes: relaxed circles normally, focused half-lidded arcs while studying */}
        {isStudying ? (
          <>
            <path d="M69 104 Q76 98 83 104" stroke="#382C3E" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <path d="M117 104 Q124 98 131 104" stroke="#382C3E" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          </>
        ) : (
          <>
            <circle cx="76" cy="104" r="5" fill="#382C3E" />
            <circle cx="124" cy="104" r="5" fill="#382C3E" />
          </>
        )}

        {/* smile: wider when celebrating or happy */}
        <path
          d={isCelebrating || isHappy ? 'M80 122 Q100 142 120 122' : 'M85 124 Q100 136 115 124'}
          stroke="#382C3E"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </motion.div>
  )
}

export default MochiFallback
