import type { TaskStatus } from '@/features/tasks'

const TABS: { value: TaskStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'COMPLETED', label: 'Completed' },
]

/**
 * Pending/Completed filter — same segmented-pill-group styling as
 * `DurationSelector`'s preset buttons (active = solid taro, inactive =
 * translucent white), just two options instead of four.
 */
function TaskFilterTabs({
  value,
  onChange,
}: {
  value: TaskStatus
  onChange: (status: TaskStatus) => void
}) {
  return (
    <div className="inline-flex gap-2 rounded-full bg-white/50 p-1" role="tablist" aria-label="Task filter">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={`rounded-full px-5 py-2 font-body text-sm font-semibold transition-colors ${
            value === tab.value
              ? 'bg-taro text-white shadow-lg shadow-taro/30'
              : 'text-ink/60 hover:bg-blush-light'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export default TaskFilterTabs
