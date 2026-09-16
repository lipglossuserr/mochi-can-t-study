import type { AxiosResponse } from 'axios'
import api from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api'
import type { BlogPost, CreateBlogPostRequest, UpdateBlogPostRequest } from '../types/blog'
import type { Comment, CreateCommentRequest } from '../types/post'

/**
 * All /api/communities/{slug}/blog calls — Community Rooms Phase 4.
 * Same shape as postService.ts: shared axios instance, nothing here
 * touches auth directly.
 */

/** GET /api/communities/{slug}/blog — the published feed, newest-first. */
export function fetchBlogPosts(slug: string): Promise<AxiosResponse<ApiResponse<BlogPost[]>>> {
  return api.get(`/communities/${slug}/blog`)
}

/** GET /api/communities/{slug}/blog/mine — the caller's own posts, drafts included. */
export function fetchMyBlogPosts(slug: string): Promise<AxiosResponse<ApiResponse<BlogPost[]>>> {
  return api.get(`/communities/${slug}/blog/mine`)
}

/** GET /api/communities/{slug}/blog/{blogId} */
export function fetchBlogPost(slug: string, blogId: number): Promise<AxiosResponse<ApiResponse<BlogPost>>> {
  return api.get(`/communities/${slug}/blog/${blogId}`)
}

/** POST /api/communities/{slug}/blog — always creates a DRAFT. */
export function createBlogPost(
  slug: string,
  payload: CreateBlogPostRequest,
): Promise<AxiosResponse<ApiResponse<BlogPost>>> {
  return api.post(`/communities/${slug}/blog`, payload)
}

/** PATCH /api/communities/{slug}/blog/{blogId} — author-only edit. */
export function updateBlogPost(
  slug: string,
  blogId: number,
  payload: UpdateBlogPostRequest,
): Promise<AxiosResponse<ApiResponse<BlogPost>>> {
  return api.patch(`/communities/${slug}/blog/${blogId}`, payload)
}

/** DELETE /api/communities/{slug}/blog/{blogId} — author or moderator/admin. */
export function deleteBlogPost(slug: string, blogId: number): Promise<AxiosResponse<ApiResponse<null>>> {
  return api.delete(`/communities/${slug}/blog/${blogId}`)
}

/** POST /api/communities/{slug}/blog/{blogId}/publish — author-only. */
export function publishBlogPost(slug: string, blogId: number): Promise<AxiosResponse<ApiResponse<BlogPost>>> {
  return api.post(`/communities/${slug}/blog/${blogId}/publish`)
}

/** POST /api/communities/{slug}/blog/{blogId}/unpublish — author-only. */
export function unpublishBlogPost(slug: string, blogId: number): Promise<AxiosResponse<ApiResponse<BlogPost>>> {
  return api.post(`/communities/${slug}/blog/${blogId}/unpublish`)
}

/** POST /api/communities/{slug}/blog/{blogId}/upvote — toggle; calling it again removes the upvote. */
export function toggleBlogPostUpvote(slug: string, blogId: number): Promise<AxiosResponse<ApiResponse<BlogPost>>> {
  return api.post(`/communities/${slug}/blog/${blogId}/upvote`)
}

/** GET /api/communities/{slug}/blog/{blogId}/comments */
export function fetchBlogComments(
  slug: string,
  blogId: number,
): Promise<AxiosResponse<ApiResponse<Comment[]>>> {
  return api.get(`/communities/${slug}/blog/${blogId}/comments`)
}

/** POST /api/communities/{slug}/blog/{blogId}/comments */
export function createBlogComment(
  slug: string,
  blogId: number,
  payload: CreateCommentRequest,
): Promise<AxiosResponse<ApiResponse<Comment>>> {
  return api.post(`/communities/${slug}/blog/${blogId}/comments`, payload)
}

/** DELETE /api/communities/{slug}/blog/{blogId}/comments/{commentId} — author or moderator/admin. */
export function deleteBlogComment(
  slug: string,
  blogId: number,
  commentId: number,
): Promise<AxiosResponse<ApiResponse<null>>> {
  return api.delete(`/communities/${slug}/blog/${blogId}/comments/${commentId}`)
}

/** POST /api/communities/{slug}/blog/{blogId}/comments/{commentId}/upvote — toggle. */
export function toggleBlogCommentUpvote(
  slug: string,
  blogId: number,
  commentId: number,
): Promise<AxiosResponse<ApiResponse<Comment>>> {
  return api.post(`/communities/${slug}/blog/${blogId}/comments/${commentId}/upvote`)
}
