import type { AxiosResponse } from 'axios'
import api from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api'
import type { CreateReportRequest, Report, ReportStatus } from '../types/report'

/** All /api/communities/{slug}/reports calls — Community Rooms Phase 5. Same shape as blogService.ts/postService.ts. */

/** POST /api/communities/{slug}/reports — open to any APPROVED member. */
export function createReport(slug: string, payload: CreateReportRequest): Promise<AxiosResponse<ApiResponse<Report>>> {
  return api.post(`/communities/${slug}/reports`, payload)
}

/** GET /api/communities/{slug}/reports — moderator/admin only. Defaults to the PENDING queue. */
export function fetchReports(
  slug: string,
  status: ReportStatus = 'PENDING',
): Promise<AxiosResponse<ApiResponse<Report[]>>> {
  return api.get(`/communities/${slug}/reports`, { params: { status } })
}

/** POST /api/communities/{slug}/reports/{reportId}/dismiss */
export function dismissReport(slug: string, reportId: number): Promise<AxiosResponse<ApiResponse<Report>>> {
  return api.post(`/communities/${slug}/reports/${reportId}/dismiss`)
}

/** POST /api/communities/{slug}/reports/{reportId}/remove-content */
export function removeReportedContent(slug: string, reportId: number): Promise<AxiosResponse<ApiResponse<Report>>> {
  return api.post(`/communities/${slug}/reports/${reportId}/remove-content`)
}

/** POST /api/communities/{slug}/reports/{reportId}/ban */
export function banReportedAuthor(slug: string, reportId: number): Promise<AxiosResponse<ApiResponse<Report>>> {
  return api.post(`/communities/${slug}/reports/${reportId}/ban`)
}
