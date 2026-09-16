import type { Membership, MembershipRole } from '@/features/community'

interface ApprovedMemberRowProps {
  membership: Membership
  currentUid: string | null
  isCallerAdmin: boolean
  deciding: boolean
  onChangeRole: (role: MembershipRole) => void
  onBan: () => void
}

const ROLES: MembershipRole[] = ['MEMBER', 'MODERATOR', 'ADMIN']

/**
 * One row in the "Manage members" panel — Community Rooms, Phase 5
 * follow-up (admin demotion/transfer, closing the gap the ban feature
 * left: an ADMIN couldn't be banned or otherwise removed). The role
 * dropdown only renders for an ADMIN caller — a moderator can still
 * ban, but role changes are admin-only on the backend (see
 * `CommunityService.changeRole`'s javadoc), so there's no point
 * showing a control that would just 403.
 */
function ApprovedMemberRow({ membership, currentUid, isCallerAdmin, deciding, onChangeRole, onBan }: ApprovedMemberRowProps) {
  const isSelf = currentUid !== null && membership.userUid === currentUid

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/50 bg-white/40 px-4 py-3">
      <div>
        <p className="font-body text-sm font-semibold text-ink">
          {membership.userUid}
          {isSelf && <span className="ml-1.5 font-normal text-ink/40">(you)</span>}
        </p>
        <p className="font-body text-xs text-ink/45">{membership.role}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isCallerAdmin && (
          <select
            value={membership.role}
            disabled={deciding}
            onChange={(event) => onChangeRole(event.target.value as MembershipRole)}
            className="rounded-full border border-white/60 bg-white/70 px-3 py-1.5 font-body text-xs font-semibold text-ink/70 disabled:opacity-50"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        )}
        {!isSelf && (
          <button
            type="button"
            disabled={deciding}
            onClick={onBan}
            className="rounded-full bg-berry px-4 py-1.5 font-body text-xs font-semibold text-white disabled:opacity-50"
          >
            Ban
          </button>
        )}
      </div>
    </div>
  )
}

export default ApprovedMemberRow
