import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { BlogPost } from '@/features/community'

/** Module scope, not render scope — see CommunityCard's identical note for why. */
const MotionLink = motion.create(Link)

interface BlogCardProps {
  post: BlogPost
  slug: string
}

/**
 * One blog post in the feed or "My drafts" list — same card shell and
 * spring-physics hover as `CommunityCard`/`PostCard` so the blog layer
 * doesn't read as a different visual language from the rest of
 * Community Rooms. Links through to the full reader at
 * `/community/:slug/blog/:blogId`.
 */
function BlogCard({ post, slug }: BlogCardProps) {
  const isDraft = post.status === 'DRAFT'

  return (
    <MotionLink
      to={`/community/${slug}/blog/${post.id}`}
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
      whileTap={{ scale: 0.98, y: -1 }}
      className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-white/55 bg-white/50 shadow-[0_18px_50px_-20px_rgba(168,106,138,0.45)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_24px_60px_-16px_rgba(168,106,138,0.5)]"
    >
      {post.coverImageUrl ? (
        <div className="h-40 overflow-hidden">
          <motion.img
            src={post.coverImageUrl}
            alt=""
            className="h-full w-full object-cover"
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 0.4 }}
          />
        </div>
      ) : (
        <div className="flex h-24 items-center justify-center bg-gradient-to-br from-taro-light/60 via-blush-light/50 to-petal/60">
          <span className="font-display text-3xl opacity-60">📖</span>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2.5 p-6">
        <div className="flex flex-wrap items-center gap-2">
          {isDraft && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blush/30 px-3 py-1 font-body text-xs font-semibold text-berry">
              📝 Draft
            </span>
          )}
          <span className="font-body text-xs text-ink/40">⏱ {post.readingTimeMinutes} min read</span>
        </div>

        <h3 className="font-display text-lg font-semibold leading-snug text-ink transition-colors group-hover:text-taro-dark">
          {post.title}
        </h3>

        {post.excerpt && (
          <p className="line-clamp-3 flex-1 font-body text-sm leading-relaxed text-ink/60">{post.excerpt}</p>
        )}

        <div className="mt-1 flex items-center justify-between border-t border-white/50 pt-3 font-body text-xs text-ink/40">
          <span className="font-medium">{post.callerIsAuthor ? 'You' : shortUid(post.authorUid)}</span>
          <div className="flex items-center gap-3">
            <span className={post.callerUpvoted ? 'font-semibold text-taro-dark' : ''}>
              ♡ {post.upvoteCount}
            </span>
            <span>💬 {post.commentCount}</span>
          </div>
        </div>
      </div>
    </MotionLink>
  )
}

function shortUid(uid: string): string {
  return `Member ${uid.slice(0, 6)}`
}

export default BlogCard
