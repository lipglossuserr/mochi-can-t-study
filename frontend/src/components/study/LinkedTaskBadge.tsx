/**
 * Small pill showing which task the running session is linked to, if
 * any. Same visual language as `FocusStatusBadge` (a glanceable pill,
 * not a card). Renders nothing for a session with no linked task, so
 * callers can render it unconditionally.
 */
function LinkedTaskBadge({ title }: { title: string | null }) {
  if (!title) return null

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-taro-light/50 px-4 py-1.5 font-body text-xs font-semibold text-taro-dark">
      <span aria-hidden="true">📎</span>
      Studying for: {title}
    </span>
  )
}

export default LinkedTaskBadge
