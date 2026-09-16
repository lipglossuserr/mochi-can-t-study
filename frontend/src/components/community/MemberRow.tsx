import type { Membership } from '@/features/community'

interface MemberRowProps {
  membership: Membership
  deciding: boolean
  onApprove: () => void
  onReject: () => void
}

/**
 * One row in the pending-requests moderation queue. Deliberately just
 * the requester's uid for now — Phase 1 has no user-profile lookup
 * wired into this feature yet, so a friendly display name isn't
 * available here without a second round-trip; that's a natural Phase 2
 * follow-up once posts need author display names too.
 */
function MemberRow({ membership, deciding, onApprove, onReject }: MemberRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/50 bg-white/40 px-4 py-3">
      <div>
        <p className="font-body text-sm font-semibold text-ink">{membership.userUid}</p>
        <p className="font-body text-xs text-ink/45">Requested {new Date(membership.requestedAt).toLocaleDateString()}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          disabled={deciding}
          onClick={onReject}
          className="rounded-full border border-white/60 bg-white/70 px-4 py-1.5 font-body text-xs font-semibold text-ink/60 disabled:opacity-50"
        >
          Decline
        </button>
        <button
          type="button"
          disabled={deciding}
          onClick={onApprove}
          className="rounded-full bg-matcha px-4 py-1.5 font-body text-xs font-semibold text-white disabled:opacity-50"
        >
          Approve
        </button>
      </div>
    </div>
  )
}

export default MemberRow
