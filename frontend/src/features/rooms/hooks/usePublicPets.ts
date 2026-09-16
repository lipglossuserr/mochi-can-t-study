import { useEffect, useRef, useState } from 'react'
import { fetchPublicPets } from '@/features/rooms/api/roomSessionService'
import type { PublicPetSummary } from '@/types/coStudyRoom'

/**
 * Cosmetic pet info (name/species/stage/level) for a set of uids, keyed
 * by uid for O(1) lookup when rendering tiles. Refetches only when the
 * *set* of uids actually changes (sorted+joined into a stable key) —
 * not on every heartbeat-driven participants re-render, which would
 * otherwise refire this on a 15s interval for no reason.
 */
export function usePublicPets(userIds: string[]) {
  const [petsByUid, setPetsByUid] = useState<Record<string, PublicPetSummary>>({})
  const key = [...userIds].sort().join(',')
  const lastKeyRef = useRef<string | null>(null)
  const userIdsRef = useRef(userIds)
  userIdsRef.current = userIds

  useEffect(() => {
    if (key === lastKeyRef.current) return
    lastKeyRef.current = key
    const ids = userIdsRef.current
    if (ids.length === 0) {
      setPetsByUid({})
      return
    }
    let cancelled = false
    fetchPublicPets(ids)
      .then((response) => {
        if (cancelled) return
        const byUid: Record<string, PublicPetSummary> = {}
        for (const pet of response.data.data) {
          byUid[pet.uid] = pet
        }
        setPetsByUid(byUid)
      })
      .catch(() => {
        // Presence tiles fall back to initials on failure — not worth surfacing an error for a cosmetic-only lookup.
      })
    return () => {
      cancelled = true
    }
  }, [key])

  return petsByUid
}
