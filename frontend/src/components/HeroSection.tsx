import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import MochiMascot from '@/components/MochiMascot'

function HeroSection() {
  const navigate = useNavigate()

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 py-24 text-center">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="relative z-10 flex w-full max-w-2xl flex-col items-center rounded-[2.5rem] border border-white/50 bg-white/30 px-8 py-12 shadow-[0_20px_60px_-15px_rgba(139,111,179,0.35)] backdrop-blur-xl sm:px-14"
      >
        <span className="mb-2 font-display text-2xl font-semibold tracking-tight text-taro-dark">
          🍡 Mochi
        </span>

        <MochiMascot />

        <h1 className="mt-6 font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
          Soft on stress.
          <br />
          Serious about your grades.
        </h1>

        <p className="mt-5 max-w-md font-body text-base leading-relaxed text-ink/70 sm:text-lg">
          Your AI-powered study companion — pairing a smart assistant with
          focus timers, task tracking, and progress you can actually see.
        </p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/register')}
            className="rounded-full bg-taro px-8 py-3 font-body text-sm font-semibold text-white shadow-lg shadow-taro/30 transition-colors hover:bg-taro-dark"
          >
            Get Started
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/login')}
            className="rounded-full border border-taro/30 bg-white/60 px-8 py-3 font-body text-sm font-semibold text-taro-dark shadow-sm backdrop-blur transition-colors hover:bg-white"
          >
            Login
          </motion.button>
        </div>
      </motion.div>
    </section>
  )
}

export default HeroSection
