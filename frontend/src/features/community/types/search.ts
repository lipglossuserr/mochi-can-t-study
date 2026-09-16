/**
 * Mirrors the backend's `SearchResponse`/`SearchResultResponse` DTOs
 * (`/api/communities/{slug}/search`, Community Rooms v2 backlog — see
 * `backend/.../community/dto/SearchResponse.java`).
 */
export interface SearchResult {
  type: 'POST' | 'BLOG_POST'
  id: number
  title: string
  snippet: string
  /** Set only when type === 'POST' (e.g. 'VENT', 'POLL'); null for a blog-post hit. */
  postType: string | null
  createdAt: string
}

export interface SearchResponse {
  posts: SearchResult[]
  blogPosts: SearchResult[]
}
