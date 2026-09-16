import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Community } from '@/features/community'

/** Module scope, not render scope — creating a motion component inside render would remount it (and reset any internal animation state) on every re-render. */
const MotionLink = motion.create(Link)

/**
 * One community tile in the discover grid. The CTA reads from
 * `callerRole`/`callerStatus` alone — no separate "am I a member"
 * lookup — so it's always in sync with whatever `useCommunities`/
 * `useCommunity` last fetched: Open (approved), Pending (awaiting a
 * mod), or Join/Request Access (no relationship yet), matching the
 * PostTypeBadge-style "never color alone" rule — every state has its
 * own explicit label, not just a color shift.
 * <p>
 * Hover/tap use real spring physics (framer-motion) rather than pure
 * CSS transitions — a card that's about to navigate somewhere
 * benefits from feeling physically pressable, not just visually
 * highlighted.
 */
function CommunityCard({ community }: { community: Community }) {
  const cta = ctaFor(community)
  const isPopular = community.memberCount >= 25

  return (
    <MotionLink
      to={`/community/${community.slug}`}
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
      whileTap={{ scale: 0.98, y: -1 }}
      className="group relative flex flex-col gap-3.5 overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/50 p-6 shadow-[0_18px_50px_-18px_rgba(168,106,138,0.5)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_24px_60px_-16px_rgba(168,106,138,0.55)]"
    >
      {/* Soft gradient wash in the top corner — purely decorative, sits behind everything */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-taro-light/70 to-blush-light/40 opacity-70 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3.5">
          <motion.div
            whileHover={{ rotate: 6, scale: 1.06 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-taro-light to-blush-light text-2xl shadow-inner ring-1 ring-white/70"
          >
            {community.iconUrl ? (
              <img src={community.iconUrl} alt="" className="h-full w-full rounded-2xl object-cover" />
            ) : (
              <span aria-hidden="true">{community.visibility === 'PRIVATE' ? '🔒' : '🌸'}</span>
            )}
          </motion.div>
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-semibold leading-tight text-ink">
              {community.name}
            </h3>
            <p className="mt-1 flex items-center gap-1.5 font-body text-xs text-ink/50">
              <span className="font-semibold text-ink/70">{community.memberCount}</span>
              <span>member{community.memberCount === 1 ? '' : 's'}</span>
              <span className="text-ink/25">·</span>
              <span>{community.visibility === 'PRIVATE' ? '🔒 Private' : 'Public'}</span>
            </p>
          </div>
        </div>

        {isPopular && (
          <span className="shrink-0 rounded-full bg-matcha-light px-2.5 py-1 font-body text-[10px] font-bold uppercase tracking-wide text-ink/60">
            ✦ Popular
          </span>
        )}
      </div>

      <p className="line-clamp-2 min-h-[2.5rem] font-body text-sm leading-relaxed text-ink/60">
        {community.description || 'A cozy corner of Mochi with no description yet.'}
      </p>

      <div className="mt-1 flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-4 py-1.5 font-body text-xs font-semibold transition-colors ${cta.className}`}
        >
          {cta.label}
        </span>
        <span
          aria-hidden="true"
          className="font-body text-sm text-taro-dark/40 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-taro-dark"
        >
          →
        </span>
      </div>
    </MotionLink>
  )
}

function ctaFor(community: Community): { label: string; className: string } {
  if (community.callerStatus === 'APPROVED') {
    return { label: 'Open your room', className: 'bg-taro text-white shadow-sm shadow-taro/40' }
  }
  if (community.callerStatus === 'PENDING') {
    return { label: '⏳ Pending approval', className: 'bg-butter text-berry' }
  }
  if (community.visibility === 'PRIVATE') {
    return { label: 'Request access', className: 'border border-taro/30 bg-white/70 text-ink/70' }
  }
  return { label: '+ Join community', className: 'border border-taro/30 bg-white/70 text-taro' }
}

export default CommunityCard
