import { motion } from 'framer-motion'
import type { Feature } from '@/types/feature'

interface FeatureCardProps extends Feature {
  index: number
}

function FeatureCard({ icon, title, description, index }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: 'easeOut' }}
      className="glow-hover group flex flex-col items-start gap-3 rounded-3xl border border-white/50 bg-white/40 p-6 shadow-[0_15px_40px_-20px_rgba(56,44,62,0.25)] backdrop-blur-lg"
    >
      <motion.div
        whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
        transition={{ duration: 0.5 }}
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-taro to-blush text-xl"
      >
        {icon}
      </motion.div>
      <h3 className="font-display text-lg font-semibold text-ink transition-colors group-hover:text-taro-dark">{title}</h3>
      <p className="font-body text-sm leading-relaxed text-ink/70">
        {description}
      </p>
    </motion.div>
  )
}

export default FeatureCard
