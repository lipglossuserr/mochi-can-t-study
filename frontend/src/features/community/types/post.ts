/**
 * Mirrors the backend's `PostResponse`/`PollOptionResponse` DTOs
 * (`/api/communities/{slug}/posts`, Community Rooms Phase 2 — see
 * `backend/.../community/dto/PostResponse.java`), the same way
 * `types/community.ts` mirrors `CommunityResponse`.
 */
export type PostType = 'ROOM_SHARE' | 'HELP_REQUEST' | 'VENT' | 'POLL'

export interface PollOption {
  id: number
  label: string
  voteCount: number
  displayOrder: number
}

export interface Post {
  id: number
  communityId: number
  /** Null when the post is anonymous and the caller is neither the author nor a moderator/admin — show "Anonymous member", never blank. */
  authorUid: string | null
  type: PostType
  title: string
  body: string | null
  anonymous: boolean
  pinned: boolean
  resolved: boolean
  studyRoomCode: string | null
  studyRoomExpiresAt: string | null
  upvoteCount: number
  commentCount: number
  /** Whether the caller has upvoted this post — drives filled-vs-outline icon state. */
  callerUpvoted: boolean
  /** Populated only for POLL posts; null otherwise. */
  pollOptions: PollOption[] | null
  /** Null if the caller hasn't voted (or this isn't a POLL post). */
  callerVotedOptionId: number | null
  createdAt: string
  updatedAt: string
}

export interface CreatePostRequest {
  type: PostType
  title: string
  body?: string | null
  /** Wire property is `anonymous`, not `isAnonymous` — matches the backend DTO's actual JSON property; see its javadoc. */
  anonymous?: boolean
  /** ROOM_SHARE only. */
  studyRoomCode?: string | null
  studyRoomExpiresAt?: string | null
  /** POLL only — 2 to 10 option labels. */
  pollOptions?: string[]
}

export interface UpdatePostRequest {
  title?: string
  body?: string | null
}

export type PostSort = 'new' | 'top'

/**
 * Mirrors the backend's `CommentResponse` DTO
 * (`/api/communities/{slug}/posts/{postId}/comments`, Phase 3).
 * Comments are always attributed — no anonymity option, unlike posts.
 */
export interface Comment {
  id: number
  /** Set for a comment on a short post; null for a comment on a blog post. */
  postId: number | null
  /** Set for a comment on a blog post; null for a comment on a short post. Phase 4. */
  blogPostId: number | null
  /** Set for a reply; null for a top-level comment. v2 backlog (threaded comments) — one level of nesting only. */
  parentCommentId: number | null
  authorUid: string
  body: string
  upvoteCount: number
  callerUpvoted: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateCommentRequest {
  body: string
  /** Optional — set to reply to a top-level comment. v2 backlog (threaded comments). */
  parentCommentId?: number
}
