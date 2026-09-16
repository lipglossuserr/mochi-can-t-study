import type { PostType } from '@/features/community'

/**
 * The type pill shown on every post card. Colors follow the Community
 * Rooms design doc's design-system section: room-share = taro,
 * help-request = butter/amber ("needs attention"), poll = blush, vent
 * = soft neutral — deliberately the least attention-grabbing of the
 * four so vents don't get algorithmically amplified. Text is never
 * color-only; every variant pairs with a short label.
 */
function PostTypeBadge({ type }: { type: PostType }) {
  const config = CONFIG[type]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-body text-xs font-semibold ${config.className}`}
    >
      <span aria-hidden="true">{config.emoji}</span>
      {config.label}
    </span>
  )
}

const CONFIG: Record<PostType, { label: string; emoji: string; className: string }> = {
  ROOM_SHARE: { label: 'Room', emoji: '🔗', className: 'bg-taro/15 text-taro-dark' },
  HELP_REQUEST: { label: 'Help', emoji: '🙋', className: 'bg-butter text-berry' },
  POLL: { label: 'Poll', emoji: '📊', className: 'bg-blush/20 text-berry' },
  VENT: { label: 'Vent', emoji: '💭', className: 'bg-ink/5 text-ink/60' },
}

export default PostTypeBadge
