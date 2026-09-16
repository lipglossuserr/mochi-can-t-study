/**
 * Mirrors the backend's `CommunityResponse`/`MembershipResponse` DTOs
 * (`/api/communities`, Community Rooms Phase 1 — see
 * `backend/.../community/dto/*.java`), the same way `types/task.ts`
 * mirrors `TaskResponse`.
 */
export type CommunityVisibility = 'PUBLIC' | 'PRIVATE'

export type MembershipRole = 'MEMBER' | 'MODERATOR' | 'ADMIN'

export type MembershipStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'BANNED'

export interface Community {
  id: number
  slug: string
  name: string
  description: string | null
  visibility: CommunityVisibility
  iconUrl: string | null
  createdByUid: string
  memberCount: number
  /** Null when the caller has no membership row at all — never joined, never requested. */
  callerRole: MembershipRole | null
  callerStatus: MembershipStatus | null
  createdAt: string
  updatedAt: string
}

export interface Membership {
  id: number
  communityId: number
  userUid: string
  role: MembershipRole
  status: MembershipStatus
  requestedAt: string
  decidedAt: string | null
  decidedByUid: string | null
}

export interface CreateCommunityRequest {
  name: string
  description?: string | null
  slug?: string | null
  visibility?: CommunityVisibility
  iconUrl?: string | null
}

/** Every field optional — see the backend's `UpdateCommunityRequest`'s javadoc for why `visibility`/`slug` aren't here. */
export interface UpdateCommunityRequest {
  name?: string
  description?: string | null
  iconUrl?: string | null
}
