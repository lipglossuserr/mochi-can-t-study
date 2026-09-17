import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/auth/AuthContext'
import { getPostAuthRedirectPath } from '@/utils/authRedirect'

function RegisterPage() {
  const { register, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await register(username.trim(), email.trim(), password)
      navigate(getPostAuthRedirectPath(location))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogle() {
    setError(null)
    setSubmitting(true)
    try {
      await loginWithGoogle()
      navigate(getPostAuthRedirectPath(location))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-taro-light via-blush-light to-cream px-6 py-16">
      <div className="pointer-events-none absolute -right-24 -top-20 h-80 w-80 rounded-full bg-taro/20 blur-3xl ambient-blob-c" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-matcha-light/40 blur-3xl ambient-blob-a" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md rounded-[2.5rem] border border-white/50 bg-white/40 p-8 shadow-[0_20px_60px_-15px_rgba(139,111,179,0.35)] backdrop-blur-xl sm:p-10"
      >
        <motion.span
          className="mochi-breathe mb-1 block cursor-default text-center font-display text-xl font-semibold text-taro-dark"
          whileHover={{ scale: 1.1, rotate: [0, -6, 6, 0] }}
          transition={{ duration: 0.4 }}
        >
          🍡 Mochi
        </motion.span>
        <h1 className="mb-6 text-center font-display text-2xl font-semibold text-ink">
          Create your account
        </h1>

        {error && (
          <p className="mb-4 rounded-2xl bg-blush/20 px-4 py-2 text-center font-body text-sm text-ink">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 font-body text-sm text-ink placeholder:text-ink/40 transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-taro focus:shadow-[0_0_0_4px_rgba(224,112,158,0.15)]"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 font-body text-sm text-ink placeholder:text-ink/40 transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-taro focus:shadow-[0_0_0_4px_rgba(224,112,158,0.15)]"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 font-body text-sm text-ink placeholder:text-ink/40 transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-taro focus:shadow-[0_0_0_4px_rgba(224,112,158,0.15)]"
            required
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 font-body text-sm text-ink placeholder:text-ink/40 transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-taro focus:shadow-[0_0_0_4px_rgba(224,112,158,0.15)]"
            required
          />

          <motion.button
            type="submit"
            whileHover={{ scale: submitting ? 1 : 1.02 }}
            whileTap={{ scale: submitting ? 1 : 0.97 }}
            disabled={submitting}
            className="glow-hover mt-2 rounded-full bg-taro px-6 py-3 font-body text-sm font-semibold text-white shadow-lg shadow-taro/30 transition-colors hover:bg-taro-dark disabled:opacity-60"
          >
            {submitting ? 'Creating account…' : 'Create Account'}
          </motion.button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-ink/10" />
          <span className="font-body text-xs uppercase tracking-wide text-ink/40">
            or
          </span>
          <div className="h-px flex-1 bg-ink/10" />
        </div>

        <motion.button
          type="button"
          onClick={handleGoogle}
          whileHover={{ scale: submitting ? 1 : 1.02 }}
          whileTap={{ scale: submitting ? 1 : 0.97 }}
          disabled={submitting}
          className="w-full rounded-full border border-taro/30 bg-white/70 px-6 py-3 font-body text-sm font-semibold text-taro-dark shadow-sm transition-colors hover:bg-white disabled:opacity-60"
        >
          Continue with Google
        </motion.button>

        <p className="mt-6 text-center font-body text-sm text-ink/60">
          Already have an account?{' '}
          <Link
            to="/login"
            state={location.state}
            className="font-semibold text-taro-dark hover:underline"
          >
            Login
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

export default RegisterPage
