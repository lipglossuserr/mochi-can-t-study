import type { AxiosResponse } from 'axios'
import api from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api'
import type { SearchResponse } from '../types/search'

/** GET /api/communities/{slug}/search — Community Rooms v2 backlog. */
export function searchCommunity(
  slug: string,
  q: string,
  limit?: number,
): Promise<AxiosResponse<ApiResponse<SearchResponse>>> {
  return api.get(`/communities/${slug}/search`, { params: { q, limit } })
}
