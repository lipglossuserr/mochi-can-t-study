import type { TaskPriority } from '@/features/tasks'

/**
 * One glanceable priority pill, same visual language as
 * `components/study/FocusStatusBadge.tsx` (dot + label, no icon).
 */
const PRIORITY: Record<TaskPriority, { label: string; className: string; dot: string }> = {
  LOW: { label: 'Low', className: 'bg-matcha-light text-ink', dot: 'bg-matcha' },
  MEDIUM: { label: 'Medium', className: 'bg-butter text-ink', dot: 'bg-rosegold' },
  HIGH: { label: 'High', className: 'bg-blush-light text-berry', dot: 'bg-berry' },
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const status = PRIORITY[priority]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-body text-[11px] font-semibold ${status.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
      {status.label}
    </span>
  )
}

export default PriorityBadge
