import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { playMeow, usePawBurst } from '@/features/community'
import type { Post } from '@/features/community'
import PostTypeBadge from './PostTypeBadge'
import PollBar from './PollBar'
import CommentThread from './CommentThread'
import ReportButton from './ReportButton'

interface PostCardProps {
  post: Post
  slug: string
  currentUid: string | null
  canModerate: boolean
  actionPending: boolean
  onVote: (optionId: number) => void
  onToggleUpvote: () => void
  onTogglePin: () => void
  onToggleResolved: () => void
  onDelete: () => void
}

/**
 * One post in a community feed. Same card shell as `CommunityCard`
 * (`.room-hover`, rounded-[2rem], white/45 glass) so posts don't read
 * as a different visual language from the rest of the app. The author
 * line reads "Anonymous member" whenever `post.authorUid` is null —
 * per the design doc, anonymous posts never show a blank author,
 * they show a stable, announced label instead.
 */
function PostCard({
  post,
  slug,
  currentUid,
  canModerate,
  actionPending,
  onVote,
  onToggleUpvote,
  onTogglePin,
  onToggleResolved,
  onDelete,
}: PostCardProps) {
  const [commentsOpen, setCommentsOpen] = useState(false)
  const { layer: pawLayer, trigger: triggerPaws } = usePawBurst()
  const isAuthor = currentUid !== null && post.authorUid === currentUid
  const canDelete = isAuthor || canModerate
  const canResolve = (isAuthor || canModerate) && post.type === 'HELP_REQUEST'
  const displayName = post.authorUid ? shortUid(post.authorUid) : 'Anonymous member'

  const handleUpvoteClick = () => {
    // Only celebrate landing an upvote, not removing one — and only a
    // fraction of the time for the sound, per "meow sometimes," not
    // "meow on every click." The paw print is quieter and shows every
    // time; the sound is the rarer treat.
    if (!post.callerUpvoted) {
      triggerPaws()
      if (Math.random() < 0.35) playMeow()
    }
    onToggleUpvote()
  }

  return (
    <div className="room-hover flex flex-col gap-4 rounded-[1.75rem] border border-white/55 bg-white/50 p-6 shadow-[0_18px_50px_-20px_rgba(168,106,138,0.45)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <PostTypeBadge type={post.type} />
          {post.pinned && (
            <span className="inline-flex items-center gap-1 rounded-full bg-matcha-light px-3 py-1 font-body text-xs font-semibold text-ink/70">
              📌 Pinned
            </span>
          )}
          {post.resolved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-matcha px-3 py-1 font-body text-xs font-semibold text-white shadow-sm shadow-matcha/30">
              ✓ Resolved
            </span>
          )}
        </div>

        {(canDelete || canModerate) && (
          <div className="flex shrink-0 items-center gap-1">
            {canModerate && (
              <motion.button
                type="button"
                disabled={actionPending}
                onClick={onTogglePin}
                whileTap={{ scale: 0.85 }}
                title={post.pinned ? 'Unpin' : 'Pin'}
                className={`grid h-7 w-7 place-items-center rounded-full text-xs transition-colors disabled:opacity-50 ${
                  post.pinned ? 'bg-matcha-light text-ink/70' : 'text-ink/35 hover:bg-white hover:text-ink/60'
                }`}
              >
                📌
              </motion.button>
            )}
            {canResolve && (
              <motion.button
                type="button"
                disabled={actionPending}
                onClick={onToggleResolved}
                whileTap={{ scale: 0.85 }}
                title={post.resolved ? 'Mark unresolved' : 'Mark resolved'}
                className={`grid h-7 w-7 place-items-center rounded-full text-xs transition-colors disabled:opacity-50 ${
                  post.resolved ? 'bg-matcha-light text-ink/70' : 'text-ink/35 hover:bg-white hover:text-ink/60'
                }`}
              >
                ✓
              </motion.button>
            )}
            {canDelete && (
              <motion.button
                type="button"
                disabled={actionPending}
                onClick={onDelete}
                whileTap={{ scale: 0.85 }}
                title="Remove"
                className="grid h-7 w-7 place-items-center rounded-full text-xs text-ink/35 transition-colors hover:bg-berry/10 hover:text-berry disabled:opacity-50"
              >
                🗑
              </motion.button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-taro-light to-blush-light font-body text-[11px] font-bold text-taro-dark"
        >
          {displayName.slice(-2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold leading-snug text-ink">{post.title}</h3>
          <p className="mt-0.5 font-body text-xs text-ink/40">
            {displayName} <span className="text-ink/25">·</span> {timeAgo(post.createdAt)}
          </p>
        </div>
      </div>

      {post.body && (
        <p className="whitespace-pre-wrap pl-11 font-body text-sm leading-relaxed text-ink/70">{post.body}</p>
      )}

      {post.type === 'ROOM_SHARE' && post.studyRoomCode && (
        <div className="ml-11 flex items-center gap-2.5 rounded-2xl border border-taro/25 bg-gradient-to-r from-taro/10 to-blush/10 px-4 py-2.5">
          <span className="font-body text-xs text-ink/50">Room code</span>
          <span className="rounded-lg bg-white/70 px-2.5 py-0.5 font-display text-sm font-semibold tracking-wide text-taro-dark">
            {post.studyRoomCode}
          </span>
        </div>
      )}

      {post.type === 'POLL' && post.pollOptions && (
        <div className="ml-11">
          <PollBar
            options={post.pollOptions}
            callerVotedOptionId={post.callerVotedOptionId}
            disabled={actionPending}
            onVote={onVote}
          />
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-white/50 pt-3.5">
        <div className="relative">
          {pawLayer}
          <motion.button
            type="button"
            disabled={actionPending}
            onClick={handleUpvoteClick}
            whileTap={{ scale: 0.88 }}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-body text-sm font-semibold transition-colors ${
              post.callerUpvoted
                ? 'bg-taro text-white shadow-sm shadow-taro/40'
                : 'bg-white/60 text-ink/50 hover:bg-taro/10 hover:text-taro-dark'
            }`}
          >
            <motion.span
              animate={post.callerUpvoted ? { y: [0, -3, 0] } : { y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="text-xs"
            >
              ▲
            </motion.span>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={post.upvoteCount}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 10, opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {post.upvoteCount}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.88 }}
          onClick={() => setCommentsOpen((prev) => !prev)}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-body text-sm font-semibold transition-colors ${
            commentsOpen ? 'bg-blush/20 text-berry' : 'bg-white/60 text-ink/50 hover:bg-blush/10 hover:text-berry'
          }`}
        >
          💬 {post.commentCount}
        </motion.button>
        {!isAuthor && (
          <div className="ml-auto">
            <ReportButton slug={slug} targetType="POST" targetId={post.id} />
          </div>
        )}
      </div>

      {commentsOpen && (
        <CommentThread slug={slug} postId={post.id} currentUid={currentUid} canModerate={canModerate} />
      )}
    </div>
  )
}

/** Firebase uids aren't display names; showing a short fragment avoids implying a full identity is known while still distinguishing authors. */
function shortUid(uid: string): string {
  return `Member ${uid.slice(0, 6)}`
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default PostCard
