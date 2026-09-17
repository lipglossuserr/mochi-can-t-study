import { useCallback, useRef, useState, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import type { Task } from '@/features/tasks'
import { formatTaskDate, isOverdue } from '@/features/tasks/utils/formatTaskDate'
import PriorityBadge from './PriorityBadge'

interface TaskListItemProps {
  task: Task
  onComplete: (id: number) => void
  onReopen: (id: number) => void
  onEdit: (task: Task) => void
  onDeleteRequest: (task: Task) => void
  completing: boolean
  reopening: boolean
  deleting: boolean
}

interface Particle {
  id: number
  dx: number
  dy: number
  glyph: string
}

const CELEBRATE_GLYPHS = ['✦', '♡', '⋆', '✧', '🍡']
const CELEBRATE_COUNT = 7
const CELEBRATE_LIFETIME_MS = 750

/**
 * One task row. Same rounded glass-card convention as every other list
 * row in this codebase (`TaskListSkeleton`'s shape, `PetErrorCard`'s
 * corners/blur). The left-hand circular toggle is the complete/reopen
 * action — a checkbox reads instantly as "the thing you tap to finish
 * this" without needing its own label, same way `RoomActionButton`
 * favors a single tappable shape over a labeled control where the
 * action is obvious from context.
 *
 * Marking a task complete now gets a small celebratory burst (sparkles
 * + a pop) — the same "boop" particle language used by Mochi herself
 * elsewhere in the app, so finishing a task feels rewarded rather than
 * just toggling a checkbox.
 */
function TaskListItem({
  task,
  onComplete,
  onReopen,
  onEdit,
  onDeleteRequest,
  completing,
  reopening,
  deleting,
}: TaskListItemProps) {
  const isCompleted = task.status === 'COMPLETED'
  const dueLabel = formatTaskDate(task.dueDate)
  const completedLabel = formatTaskDate(task.completedAt)
  const overdue = isOverdue(task.dueDate, task.status)
  const busy = completing || reopening || deleting

  const [particles, setParticles] = useState<Particle[]>([])
  const [popping, setPopping] = useState(false)
  const idRef = useRef(0)

  const celebrate = useCallback(() => {
    setPopping(true)
    window.setTimeout(() => setPopping(false), 380)

    const burst: Particle[] = Array.from({ length: CELEBRATE_COUNT }, () => {
      const angle = Math.random() * Math.PI * 2
      const distance = 24 + Math.random() * 20
      return {
        id: idRef.current++,
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        glyph: CELEBRATE_GLYPHS[Math.floor(Math.random() * CELEBRATE_GLYPHS.length)],
      }
    })
    setParticles((current) => [...current, ...burst])
    window.setTimeout(() => {
      setParticles((current) => current.filter((p) => !burst.some((b) => b.id === p.id)))
    }, CELEBRATE_LIFETIME_MS)
  }, [])

  const handleToggle = () => {
    if (isCompleted) {
      onReopen(task.id)
    } else {
      celebrate()
      onComplete(task.id)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`glow-hover flex items-start gap-4 rounded-[1.75rem] border border-white/50 bg-white/45 p-5 shadow-sm backdrop-blur-xl transition-opacity ${
        busy ? 'opacity-60' : ''
      }`}
    >
      <div className="relative mt-0.5 shrink-0">
        <button
          type="button"
          onClick={handleToggle}
          disabled={busy}
          aria-label={isCompleted ? `Mark "${task.title}" as pending` : `Mark "${task.title}" as complete`}
          aria-pressed={isCompleted}
          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 font-body text-sm font-bold transition-all duration-150 disabled:cursor-not-allowed ${
            popping ? 'scale-125' : ''
          } ${
            isCompleted
              ? 'border-matcha bg-matcha text-white'
              : 'border-taro/40 bg-white/70 text-transparent hover:scale-110 hover:border-taro hover:bg-taro-light/40'
          }`}
        >
          {isCompleted ? '✓' : reopening ? '…' : completing ? '…' : ''}
        </button>

        {particles.length > 0 && (
          <div className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
            {particles.map((particle) => (
              <span
                key={particle.id}
                className="boop-particle absolute left-1/2 top-1/2 select-none text-sm text-matcha"
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
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={`break-words font-body text-sm font-semibold text-ink ${
            isCompleted ? 'text-ink/50 line-through' : ''
          }`}
        >
          {task.title}
        </p>

        {task.description && (
          <p className="mt-1 line-clamp-2 break-words font-body text-xs text-ink/55">
            {task.description}
          </p>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <PriorityBadge priority={task.priority} />

          {dueLabel && !isCompleted && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-body text-[11px] font-semibold ${
                overdue ? 'bg-blush-light text-berry' : 'bg-white/70 text-ink/60'
              }`}
            >
              <span aria-hidden="true">📅</span>
              {overdue ? `Overdue — ${dueLabel}` : `Due ${dueLabel}`}
            </span>
          )}

          {isCompleted && completedLabel && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-matcha-light px-2.5 py-1 font-body text-[11px] font-semibold text-ink">
              <span aria-hidden="true">✓</span>
              Completed {completedLabel}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onEdit(task)}
          disabled={busy}
          aria-label={`Edit "${task.title}"`}
          className="rounded-full p-2 font-body text-sm text-ink/50 transition-all duration-150 hover:scale-110 hover:bg-blush-light hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          ✎
        </button>
        <button
          type="button"
          onClick={() => onDeleteRequest(task)}
          disabled={busy}
          aria-label={`Delete "${task.title}"`}
          className="rounded-full p-2 font-body text-sm text-ink/50 transition-all duration-150 hover:scale-110 hover:bg-blush-light hover:text-berry disabled:cursor-not-allowed disabled:opacity-50"
        >
          🗑
        </button>
      </div>
    </motion.div>
  )
}

export default TaskListItem
