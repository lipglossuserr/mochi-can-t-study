/**
 * Mirrors the backend's `BlogPostResponse` DTO
 * (`/api/communities/{slug}/blog`, Community Rooms Phase 4 — see
 * `backend/.../community/dto/BlogPostResponse.java`), the same way
 * `types/post.ts` mirrors `PostResponse`.
 */
export type BlogStatus = 'DRAFT' | 'PUBLISHED'

export interface BlogPost {
  id: number
  communityId: number
  authorUid: string
  slug: string
  title: string
  coverImageUrl: string | null
  /** Full rich body — populated on the "get one" endpoint, null on feed/list responses. */
  body: string | null
  /** Short plain-text excerpt — populated on feed/list responses, null on "get one." */
  excerpt: string | null
  readingTimeMinutes: number
  status: BlogStatus
  upvoteCount: number
  commentCount: number
  callerUpvoted: boolean
  /** Whether the caller is the author — drives edit/publish/delete affordances. */
  callerIsAuthor: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateBlogPostRequest {
  title: string
  coverImageUrl?: string | null
  body: string
}

export interface UpdateBlogPostRequest {
  title?: string
  coverImageUrl?: string | null
  body?: string
}
