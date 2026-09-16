import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import FadeInSection from '@/components/FadeInSection'
import CommunityErrorState from '@/components/community/CommunityErrorState'
import PostCard from '@/components/community/PostCard'
import { useAuth } from '@/auth/AuthContext'
import { deletePost, useCommunity, usePost } from '@/features/community'

/**
 * A single post's standalone page — closes a real gap flagged when
 * search shipped (v2 backlog): search results for a post had nowhere
 * to link to, since posts previously only ever rendered inline in a
 * feed. Route: `/community/:slug/posts/:postId`. Reuses `PostCard`
 * wholesale for the actual rendering (including its embedded
 * `CommentThread`) rather than duplicating that layout — this page is
 * a thin wrapper providing `usePost`'s single-post lifecycle instead
 * of `usePosts`' feed-list one.
 * <p>
 * Delete isn't on `usePost` (see that hook's javadoc for why) — this
 * page calls `deletePost` directly and navigates back to the room on
 * success, since there's nothing left on this page to show afterward.
 */
function PostDetailPage() {
  const { slug, postId } = useParams<{ slug: string; postId: string }>()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { community } = useCommunity(slug ?? '')
  const numericPostId = postId ? Number(postId) : null

  const { post, loading, error, reload, togglePin, toggleResolved, vote, toggleUpvote } = usePost(
    slug ?? '',
    numericPostId,
  )
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const canModerate = community?.callerRole === 'MODERATOR' || community?.callerRole === 'ADMIN'

  if (!slug || numericPostId === null) return null

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deletePost(slug, numericPostId)
      navigate(`/community/${slug}`)
    } catch {
      setDeleteError("Couldn't remove that post right now.")
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="animate-pulse rounded-[2rem] border border-white/50 bg-white/35 p-10" aria-busy="true" />
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
        {deleteError && <p className="mb-2 font-body text-xs text-berry">{deleteError}</p>}
        <PostCard
          post={post}
          slug={slug}
          currentUid={currentUser?.uid ?? null}
          canModerate={canModerate}
          actionPending={deleting}
          onVote={vote}
          onToggleUpvote={toggleUpvote}
          onTogglePin={togglePin}
          onToggleResolved={toggleResolved}
          onDelete={handleDelete}
        />
      </FadeInSection>
    </div>
  )
}

export default PostDetailPage
