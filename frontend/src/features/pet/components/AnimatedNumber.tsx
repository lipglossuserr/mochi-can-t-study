import { useEffect } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'

interface AnimatedNumberProps {
  value: number
  duration?: number
  className?: string
  formatter?: (value: number) => string
}

/**
 * AnimatedNumber
 *
 * Counts smoothly from whatever it last showed to a new value, instead
 * of snapping. Used for coins, XP, and stat percentages — anywhere a
 * Feed/Play/session-complete refresh changes a number the person is
 * looking at.
 *
 * The visible digits are decorative (aria-hidden); a visually-hidden
 * span carries the real, final value for screen readers so nothing is
 * lost by animating.
 */
function AnimatedNumber({ value, duration = 0.6, className, formatter }: AnimatedNumberProps) {
  const motionValue = useMotionValue(value)
  const display = useTransform(motionValue, (latest) =>
    formatter ? formatter(Math.round(latest)) : Math.round(latest).toLocaleString(),
  )

  useEffect(() => {
    const controls = animate(motionValue, value, { duration, ease: 'easeOut' })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])

  return (
    <span className="relative inline-block">
      <span className="sr-only">{formatter ? formatter(value) : value.toLocaleString()}</span>
      <motion.span aria-hidden="true" className={className}>
        {display}
      </motion.span>
    </span>
  )
}

export default AnimatedNumber
