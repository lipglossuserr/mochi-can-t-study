import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface FadeInSectionProps {
  children: ReactNode
  delay?: number
  className?: string
}

/**
 * FadeInSection
 *
 * The same "fade up on mount" entrance (opacity 0→1, y 20→0, 0.5s
 * easeOut) was being retyped in every dashboard block. This is that
 * trio, once, parameterized only by stagger delay.
 */
function FadeInSection({ children, delay = 0, className }: FadeInSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export default FadeInSection
