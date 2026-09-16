import { useCallback, useEffect, useState } from 'react'
import { friendlyMessage } from '@/features/pet/utils/apiErrors'
import { banReportedAuthor, dismissReport, fetchReports, removeReportedContent } from '../api/reportService'
import type { Report, ReportStatus } from '../types/report'

/**
 * One community's moderation queue (Community Rooms, Phase 5) plus the
 * three review actions — same shape as `useMembers`'s pending-queue
 * pattern: only meant to be mounted for a caller who's already
 * MODERATOR/ADMIN, since the backend would 403 anyone else's request
 * anyway.
 */
export function useReports(slug: string, status: ReportStatus = 'PENDING') {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionPendingId, setActionPendingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchReports(slug, status)
      setReports(response.data.data)
    } catch (err) {
      setError(friendlyMessage(err, "Couldn't load reports right now."))
    } finally {
      setLoading(false)
    }
  }, [slug, status])

  useEffect(() => {
    load()
  }, [load])

  const dismiss = useCallback(
    async (reportId: number) => {
      setActionPendingId(reportId)
      setActionError(null)
      try {
        await dismissReport(slug, reportId)
        setReports((prev) => prev.filter((r) => r.id !== reportId))
      } catch (err) {
        setActionError(friendlyMessage(err, "Couldn't dismiss that report right now."))
      } finally {
        setActionPendingId(null)
      }
    },
    [slug],
  )

  const removeContent = useCallback(
    async (reportId: number) => {
      setActionPendingId(reportId)
      setActionError(null)
      try {
        await removeReportedContent(slug, reportId)
        setReports((prev) => prev.filter((r) => r.id !== reportId))
      } catch (err) {
        setActionError(friendlyMessage(err, "Couldn't remove that content right now."))
      } finally {
        setActionPendingId(null)
      }
    },
    [slug],
  )

  const banAuthor = useCallback(
    async (reportId: number) => {
      setActionPendingId(reportId)
      setActionError(null)
      try {
        await banReportedAuthor(slug, reportId)
        setReports((prev) => prev.filter((r) => r.id !== reportId))
      } catch (err) {
        setActionError(friendlyMessage(err, "Couldn't ban that member right now."))
      } finally {
        setActionPendingId(null)
      }
    },
    [slug],
  )

  return {
    reports,
    loading,
    error,
    reload: load,
    dismiss,
    removeContent,
    banAuthor,
    actionPendingId,
    actionError,
    dismissActionError: () => setActionError(null),
  }
}
