import type { AxiosResponse } from 'axios'
import api from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api'
import type {
  Comment,
  CreateCommentRequest,
  CreatePostRequest,
  Post,
  PostSort,
  PostType,
  UpdatePostRequest,
} from '../types/post'

/**
 * All /api/communities/{slug}/posts calls — Community Rooms Phase 2.
 * Uses the shared axios instance from src/api/axiosClient.ts, same
 * convention as communityService.ts — nothing here touches auth
 * directly.
 */

/** GET /api/communities/{slug}/posts — optional type filter, sort=new|top (default new). */
export function fetchPosts(
  slug: string,
  options?: { type?: PostType; sort?: PostSort },
): Promise<AxiosResponse<ApiResponse<Post[]>>> {
  return api.get(`/communities/${slug}/posts`, {
    params: { type: options?.type, sort: options?.sort ?? 'new' },
  })
}

/** GET /api/communities/{slug}/posts/{postId} */
export function fetchPost(slug: string, postId: number): Promise<AxiosResponse<ApiResponse<Post>>> {
  return api.get(`/communities/${slug}/posts/${postId}`)
}

/** POST /api/communities/{slug}/posts */
export function createPost(
  slug: string,
  payload: CreatePostRequest,
): Promise<AxiosResponse<ApiResponse<Post>>> {
  return api.post(`/communities/${slug}/posts`, payload)
}

/** PATCH /api/communities/{slug}/posts/{postId} — author-only title/body edit. */
export function updatePost(
  slug: string,
  postId: number,
  payload: UpdatePostRequest,
): Promise<AxiosResponse<ApiResponse<Post>>> {
  return api.patch(`/communities/${slug}/posts/${postId}`, payload)
}

/** DELETE /api/communities/{slug}/posts/{postId} — author or moderator/admin. */
export function deletePost(slug: string, postId: number): Promise<AxiosResponse<ApiResponse<null>>> {
  return api.delete(`/communities/${slug}/posts/${postId}`)
}

/** POST /api/communities/{slug}/posts/{postId}/pin — moderator/admin only; toggles. */
export function togglePostPin(slug: string, postId: number): Promise<AxiosResponse<ApiResponse<Post>>> {
  return api.post(`/communities/${slug}/posts/${postId}/pin`)
}

/** POST /api/communities/{slug}/posts/{postId}/resolve — author or moderator/admin; toggles. */
export function togglePostResolved(slug: string, postId: number): Promise<AxiosResponse<ApiResponse<Post>>> {
  return api.post(`/communities/${slug}/posts/${postId}/resolve`)
}

/** POST /api/communities/{slug}/posts/{postId}/vote — POLL posts only, one vote per user. */
export function votePost(
  slug: string,
  postId: number,
  optionId: number,
): Promise<AxiosResponse<ApiResponse<Post>>> {
  return api.post(`/communities/${slug}/posts/${postId}/vote`, { optionId })
}

/** POST /api/communities/{slug}/posts/{postId}/upvote — toggle; calling it again removes the upvote. */
export function togglePostUpvote(slug: string, postId: number): Promise<AxiosResponse<ApiResponse<Post>>> {
  return api.post(`/communities/${slug}/posts/${postId}/upvote`)
}

/** GET /api/communities/{slug}/posts/{postId}/comments */
export function fetchComments(
  slug: string,
  postId: number,
): Promise<AxiosResponse<ApiResponse<Comment[]>>> {
  return api.get(`/communities/${slug}/posts/${postId}/comments`)
}

/** POST /api/communities/{slug}/posts/{postId}/comments */
export function createComment(
  slug: string,
  postId: number,
  payload: CreateCommentRequest,
): Promise<AxiosResponse<ApiResponse<Comment>>> {
  return api.post(`/communities/${slug}/posts/${postId}/comments`, payload)
}

/** DELETE /api/communities/{slug}/posts/{postId}/comments/{commentId} — author or moderator/admin. */
export function deleteComment(
  slug: string,
  postId: number,
  commentId: number,
): Promise<AxiosResponse<ApiResponse<null>>> {
  return api.delete(`/communities/${slug}/posts/${postId}/comments/${commentId}`)
}

/** POST /api/communities/{slug}/posts/{postId}/comments/{commentId}/upvote — toggle. */
export function toggleCommentUpvote(
  slug: string,
  postId: number,
  commentId: number,
): Promise<AxiosResponse<ApiResponse<Comment>>> {
  return api.post(`/communities/${slug}/posts/${postId}/comments/${commentId}/upvote`)
}
