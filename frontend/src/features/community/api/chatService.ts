import type { AxiosResponse } from 'axios'
import api from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api'

interface SendChatMessageResponse {
  messageId: string
}

/**
 * POST /api/communities/{slug}/chat/messages — the free, Spring-hosted
 * chat-send path (see the backend's `ChatService` javadoc for why
 * this is a REST endpoint rather than a Firebase Cloud Function:
 * Cloud Functions require the paid Blaze plan to deploy at all).
 * Reading chat stays a direct Firestore subscription (see
 * `useCommunityChat`) — only sending goes through this endpoint.
 */
export function sendChatMessage(
  slug: string,
  body: string,
): Promise<AxiosResponse<ApiResponse<SendChatMessageResponse>>> {
  return api.post(`/communities/${slug}/chat/messages`, { body })
}
