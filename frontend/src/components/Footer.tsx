import { motion } from 'framer-motion'

function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/40 bg-white/20 px-6 py-8 text-center backdrop-blur-lg">
      <p className="font-body text-sm text-ink/60">
        Built with{' '}
        <motion.span
          className="inline-block cursor-default"
          animate={{ scale: [1, 1.25, 1] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden="true"
        >
          ❤️
        </motion.span>{' '}
        using Spring Boot + React
      </p>
    </footer>
  )
}

export default Footer
