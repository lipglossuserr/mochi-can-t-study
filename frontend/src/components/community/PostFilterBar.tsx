import type { PostSort, PostType } from '@/features/community'

interface PostFilterBarProps {
  type: PostType | undefined
  sort: PostSort
  onTypeChange: (type: PostType | undefined) => void
  onSortChange: (sort: PostSort) => void
}

const TYPE_FILTERS: { value: PostType | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 'ROOM_SHARE', label: '🔗 Rooms' },
  { value: 'HELP_REQUEST', label: '🙋 Help' },
  { value: 'POLL', label: '📊 Polls' },
  { value: 'VENT', label: '💭 Vents' },
]

/** Filter chips + sort toggle sitting above the post feed. */
function PostFilterBar({ type, sort, onTypeChange, onSortChange }: PostFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-1.5">
        {TYPE_FILTERS.map((filter) => (
          <button
            key={filter.label}
            type="button"
            onClick={() => onTypeChange(filter.value)}
            className={`rounded-full px-3.5 py-1.5 font-body text-xs font-semibold transition-colors ${
              type === filter.value
                ? 'bg-taro text-white'
                : 'bg-white/60 text-ink/60 hover:bg-white/90'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 rounded-full bg-white/50 p-1">
        {(['new', 'top'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSortChange(option)}
            className={`rounded-full px-3 py-1 font-body text-xs font-semibold capitalize transition-colors ${
              sort === option ? 'bg-white text-ink shadow-sm' : 'text-ink/50'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

export default PostFilterBar
