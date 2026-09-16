import { useCallback, useEffect, useState } from 'react'
import { friendlyMessage } from '@/features/pet/utils/apiErrors'
import { approveMember, banMember, changeMemberRole, fetchMembers, rejectMember } from '../api/communityService'
import type { Membership, MembershipRole, MembershipStatus } from '../types/community'

/**
 * A community's member list for one status — APPROVED for the public
 * roster, PENDING for the moderation queue (only fetched when the
 * caller is actually a moderator/admin; the backend 403s otherwise, so
 * callers should gate rendering on `callerRole` before mounting this
 * with `status: 'PENDING'`).
 */
export function useMembers(slug: string, status: MembershipStatus = 'APPROVED') {
  const [members, setMembers] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [decidingUid, setDecidingUid] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchMembers(slug, status)
      setMembers(response.data.data)
    } catch (err) {
      setError(friendlyMessage(err, "Couldn't load members right now."))
    } finally {
      setLoading(false)
    }
  }, [slug, status])

  useEffect(() => {
    load()
  }, [load])

  const approve = useCallback(
    async (targetUid: string) => {
      setDecidingUid(targetUid)
      try {
        await approveMember(slug, targetUid)
        setMembers((prev) => prev.filter((m) => m.userUid !== targetUid))
      } catch (err) {
        setError(friendlyMessage(err, "Couldn't approve that request right now."))
      } finally {
        setDecidingUid(null)
      }
    },
    [slug],
  )

  const reject = useCallback(
    async (targetUid: string) => {
      setDecidingUid(targetUid)
      try {
        await rejectMember(slug, targetUid)
        setMembers((prev) => prev.filter((m) => m.userUid !== targetUid))
      } catch (err) {
        setError(friendlyMessage(err, "Couldn't decline that request right now."))
      } finally {
        setDecidingUid(null)
      }
    },
    [slug],
  )

  /** Admin-only on the backend; a non-admin caller gets a 403 surfaced through `error`. */
  const changeRole = useCallback(
    async (targetUid: string, role: MembershipRole) => {
      setDecidingUid(targetUid)
      try {
        const response = await changeMemberRole(slug, targetUid, role)
        setMembers((prev) => prev.map((m) => (m.userUid === targetUid ? response.data.data : m)))
      } catch (err) {
        setError(friendlyMessage(err, "Couldn't update that member's role right now."))
      } finally {
        setDecidingUid(null)
      }
    },
    [slug],
  )

  /** Removes the member from this (APPROVED) list on success — a banned member is no longer an approved member. */
  const ban = useCallback(
    async (targetUid: string) => {
      setDecidingUid(targetUid)
      try {
        await banMember(slug, targetUid)
        setMembers((prev) => prev.filter((m) => m.userUid !== targetUid))
      } catch (err) {
        setError(friendlyMessage(err, "Couldn't ban that member right now."))
      } finally {
        setDecidingUid(null)
      }
    },
    [slug],
  )

  return { members, loading, error, reload: load, approve, reject, changeRole, ban, decidingUid }
}
