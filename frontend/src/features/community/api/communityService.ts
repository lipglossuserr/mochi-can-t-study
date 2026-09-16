import type { AxiosResponse } from 'axios'
import api from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api'
import type { Community, CreateCommunityRequest, Membership, MembershipRole, MembershipStatus, UpdateCommunityRequest } from '../types/community'

/**
 * All /api/communities calls. Uses the shared axios instance from
 * src/api/axiosClient.ts, same convention as taskService.ts —
 * nothing here touches auth directly.
 */

/** GET /api/communities — every PUBLIC community plus every PRIVATE one the caller has a relationship with. */
export function fetchCommunities(search?: string): Promise<AxiosResponse<ApiResponse<Community[]>>> {
  return api.get('/communities', { params: search ? { search } : undefined })
}

/** GET /api/communities/{slug} */
export function fetchCommunity(slug: string): Promise<AxiosResponse<ApiResponse<Community>>> {
  return api.get(`/communities/${slug}`)
}

/** POST /api/communities — create a community; the caller becomes its ADMIN. */
export function createCommunity(
  payload: CreateCommunityRequest,
): Promise<AxiosResponse<ApiResponse<Community>>> {
  return api.post('/communities', payload)
}

/** PATCH /api/communities/{slug} — admin-only; edits name/description/icon after creation. v2 backlog. */
export function updateCommunity(
  slug: string,
  payload: UpdateCommunityRequest,
): Promise<AxiosResponse<ApiResponse<Community>>> {
  return api.patch(`/communities/${slug}`, payload)
}

/** POST /api/communities/{slug}/join — instant for PUBLIC, PENDING for PRIVATE. */
export function joinCommunity(slug: string): Promise<AxiosResponse<ApiResponse<Membership>>> {
  return api.post(`/communities/${slug}/join`)
}

/** POST /api/communities/{slug}/leave */
export function leaveCommunity(slug: string): Promise<AxiosResponse<ApiResponse<null>>> {
  return api.post(`/communities/${slug}/leave`)
}

/** GET /api/communities/{slug}/members — APPROVED by default; PENDING requires moderator/admin standing. */
export function fetchMembers(
  slug: string,
  status: MembershipStatus = 'APPROVED',
): Promise<AxiosResponse<ApiResponse<Membership[]>>> {
  return api.get(`/communities/${slug}/members`, { params: { status } })
}

/** POST /api/communities/{slug}/members/{uid}/approve — moderator/admin only. */
export function approveMember(
  slug: string,
  targetUid: string,
): Promise<AxiosResponse<ApiResponse<Membership>>> {
  return api.post(`/communities/${slug}/members/${targetUid}/approve`)
}

/** POST /api/communities/{slug}/members/{uid}/reject — moderator/admin only. */
export function rejectMember(
  slug: string,
  targetUid: string,
): Promise<AxiosResponse<ApiResponse<Membership>>> {
  return api.post(`/communities/${slug}/members/${targetUid}/reject`)
}

/** POST /api/communities/{slug}/members/{uid}/role — admin only; see CommunityService.changeRole's javadoc for why this is stricter than approve/reject. */
export function changeMemberRole(
  slug: string,
  targetUid: string,
  role: MembershipRole,
): Promise<AxiosResponse<ApiResponse<Membership>>> {
  return api.post(`/communities/${slug}/members/${targetUid}/role`, { role })
}

/** POST /api/communities/{slug}/members/{uid}/ban — moderator/admin only; the same action `ReportService.banAuthor` takes, available directly outside the report flow. */
export function banMember(
  slug: string,
  targetUid: string,
): Promise<AxiosResponse<ApiResponse<Membership>>> {
  return api.post(`/communities/${slug}/members/${targetUid}/ban`)
}
