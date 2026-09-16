/**
 * Public surface of the community feature — Community Rooms Phase 1
 * (communities + membership) through Phase 6 (chat), plus the v2
 * backlog (search, moderation-report queue, threaded comments). Every
 * phase's own hooks/services/components carry their own "why" in
 * their file headers; this barrel just re-exports the public surface.
 * Mirrors the barrel pattern `features/tasks/index.ts` establishes:
 * everything outside this folder imports from here.
 */
export { useCommunities, useCreateCommunity } from './hooks/useCommunities'
export { useCommunity } from './hooks/useCommunity'
export { useMembers } from './hooks/useMembers'
export { usePosts } from './hooks/usePosts'
export { usePost } from './hooks/usePost'
export { useComments } from './hooks/useComments'
export { useBlogPosts } from './hooks/useBlogPosts'
export { useBlogPost } from './hooks/useBlogPost'
export { useBlogComments } from './hooks/useBlogComments'
export { useReports } from './hooks/useReports'
export { useCommunityChat } from './hooks/useCommunityChat'
export { useCommunitySearch } from './hooks/useCommunitySearch'
export { usePawBurst } from './hooks/usePawBurst'
export { useImageUpload } from './hooks/useImageUpload'
export {
  fetchCommunities,
  fetchCommunity,
  createCommunity,
  updateCommunity,
  joinCommunity,
  leaveCommunity,
  fetchMembers,
  approveMember,
  rejectMember,
  changeMemberRole,
  banMember,
} from './api/communityService'
export {
  fetchPosts,
  fetchPost,
  createPost,
  updatePost,
  deletePost,
  togglePostPin,
  togglePostResolved,
  togglePostUpvote,
  votePost,
  fetchComments,
  createComment,
  deleteComment,
  toggleCommentUpvote,
} from './api/postService'
export {
  fetchBlogPosts,
  fetchMyBlogPosts,
  fetchBlogPost,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  publishBlogPost,
  unpublishBlogPost,
  toggleBlogPostUpvote,
  fetchBlogComments,
  createBlogComment,
  deleteBlogComment,
  toggleBlogCommentUpvote,
} from './api/blogService'
export { markdownLiteToHtml } from './utils/markdownLite'
export { groupCommentsByThread } from './utils/groupCommentsByThread'
export { playMeow } from './utils/meow'
export { searchCommunity } from './api/searchService'
export { sendChatMessage } from './api/chatService'
export {
  createReport,
  fetchReports,
  dismissReport,
  removeReportedContent,
  banReportedAuthor,
} from './api/reportService'
export type {
  Community,
  Membership,
  CommunityVisibility,
  MembershipRole,
  MembershipStatus,
  CreateCommunityRequest,
  UpdateCommunityRequest,
} from './types/community'
export type {
  Post,
  PostType,
  PostSort,
  PollOption,
  CreatePostRequest,
  UpdatePostRequest,
  Comment,
  CreateCommentRequest,
} from './types/post'
export type { BlogPost, BlogStatus, CreateBlogPostRequest, UpdateBlogPostRequest } from './types/blog'
export { REPORT_REASON_LABELS } from './types/report'
export type { Report, ReportReason, ReportStatus, ReportTargetType, CreateReportRequest } from './types/report'
export type { ChatMessage } from './types/chat'
export type { SearchResult, SearchResponse as CommunitySearchResponse } from './types/search'
