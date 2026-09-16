import { Link, useNavigate, useParams } from 'react-router-dom'
import FadeInSection from '@/components/FadeInSection'
import CommunityErrorState from '@/components/community/CommunityErrorState'
import BlogCommentThread from '@/components/community/BlogCommentThread'
import ReportButton from '@/components/community/ReportButton'
import { useAuth } from '@/auth/AuthContext'
import { useBlogPost, useCommunity, markdownLiteToHtml } from '@/features/community'

/**
 * The full reader view for one blog post — Community Rooms, Phase 4.
 * Route: `/community/:slug/blog/:blogId`. Renders the full `body`
 * (via `markdownLiteToHtml`) rather than the feed's `excerpt`, per
 * `BlogPostResponse`'s split between the two. Author-only edit/delete
 * affordances mirror `PostCard`'s pattern for short posts.
 */
function BlogPostPage() {
  const { slug, blogId } = useParams<{ slug: string; blogId: string }>()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { community } = useCommunity(slug ?? '')
  const numericBlogId = blogId ? Number(blogId) : null

  const { post, loading, error, reload, toggleUpvote } = useBlogPost(slug ?? '', numericBlogId)

  const canModerate = community?.callerRole === 'MODERATOR' || community?.callerRole === 'ADMIN'

  if (!slug) return null

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="animate-pulse rounded-[2.5rem] border border-white/50 bg-white/35 p-10" aria-busy="true" />
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <CommunityErrorState message={error ?? 'Post not found.'} onRetry={reload} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link to={`/community/${slug}`} className="font-body text-sm text-ink/50 hover:text-ink/80">
        ← Back to {community?.name ?? 'community'}
      </Link>

      <FadeInSection className="mt-4">
        <article className="rounded-[2.5rem] border border-white/50 bg-white/45 p-8 shadow-[0_20px_60px_-15px_rgba(224,112,158,0.4)] backdrop-blur-xl">
          {post.coverImageUrl && (
            <div className="-mx-8 -mt-8 mb-6 h-56 overflow-hidden rounded-t-[2.5rem]">
              <img src={post.coverImageUrl} alt="" className="h-full w-full object-cover" />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {post.status === 'DRAFT' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blush/30 px-3 py-1 font-body text-xs font-semibold text-berry">
                📝 Draft — only visible to you
              </span>
            )}
            <span className="font-body text-xs text-ink/40">{post.readingTimeMinutes} min read</span>
          </div>

          <h1 className="mt-2 font-display text-2xl font-semibold leading-snug text-ink">{post.title}</h1>
          <p className="mt-1 font-body text-xs text-ink/40">
            {post.callerIsAuthor ? 'You' : post.authorUid}
            {post.publishedAt && ` · ${new Date(post.publishedAt).toLocaleDateString()}`}
          </p>

          {post.callerIsAuthor && (
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => navigate(`/community/${slug}/blog/${post.id}/edit`)}
                className="rounded-full border border-white/60 bg-white/70 px-4 py-1.5 font-body text-xs font-semibold text-ink/60 hover:bg-white"
              >
                Edit
              </button>
            </div>
          )}
          {!post.callerIsAuthor && (
            <div className="mt-4">
              <ReportButton slug={slug} targetType="BLOG_POST" targetId={post.id} />
            </div>
          )}

          <div
            className="prose prose-sm mt-6 max-w-none font-body text-sm leading-relaxed text-ink/90"
            // Safe: markdownLiteToHtml escapes all raw input before adding its own markup — see that function's javadoc.
            dangerouslySetInnerHTML={{ __html: markdownLiteToHtml(post.body ?? '') }}
          />

          {post.status === 'PUBLISHED' && (
            <div className="mt-6 flex items-center gap-4 border-t border-white/40 pt-4">
              <button
                type="button"
                onClick={() => toggleUpvote()}
                className={`rounded-full px-4 py-1.5 font-body text-sm font-semibold ${
                  post.callerUpvoted ? 'bg-taro/20 text-taro-dark' : 'text-ink/50 hover:text-taro-dark'
                }`}
              >
                ♡ {post.upvoteCount}
              </button>
              <span className="font-body text-sm text-ink/40">💬 {post.commentCount}</span>
            </div>
          )}

          {post.status === 'PUBLISHED' && numericBlogId !== null && (
            <BlogCommentThread
              slug={slug}
              blogId={numericBlogId}
              currentUid={currentUser?.uid ?? null}
              canModerate={canModerate}
            />
          )}
        </article>
      </FadeInSection>
    </div>
  )
}

export default BlogPostPage
