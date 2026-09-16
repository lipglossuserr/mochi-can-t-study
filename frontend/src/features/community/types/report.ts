/**
 * Mirrors the backend's `ReportResponse` DTO
 * (`/api/communities/{slug}/reports`, Community Rooms Phase 5 — see
 * `backend/.../community/dto/ReportResponse.java`).
 */
export type ReportReason = 'SPAM' | 'HARASSMENT' | 'OFF_TOPIC' | 'OTHER'

export type ReportStatus = 'PENDING' | 'DISMISSED' | 'RESOLVED'

export type ReportTargetType = 'POST' | 'COMMENT' | 'BLOG_POST'

export interface Report {
  id: number
  reporterUid: string
  /** Exactly one of these three is non-null — mirrors the backend's polymorphic-FK shape. */
  postId: number | null
  commentId: number | null
  blogPostId: number | null
  reason: ReportReason
  note: string | null
  status: ReportStatus
  reviewedByUid: string | null
  reviewedAt: string | null
  createdAt: string
}

export interface CreateReportRequest {
  targetType: ReportTargetType
  targetId: number
  reason: ReportReason
  note?: string
}

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  SPAM: 'Spam',
  HARASSMENT: 'Harassment',
  OFF_TOPIC: 'Off-topic',
  OTHER: 'Other',
}
