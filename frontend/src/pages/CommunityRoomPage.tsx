import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import FadeInSection from '@/components/FadeInSection'
import Toast from '@/components/Toast'
import { useAuth } from '@/auth/AuthContext'
import { useCommunity, useMembers, usePosts, useBlogPosts, playMeow } from '@/features/community'
import type { PostSort, PostType, Community, UpdateCommunityRequest } from '@/features/community'
import CommunityErrorState from '@/components/community/CommunityErrorState'
import MemberRow from '@/components/community/MemberRow'
import ApprovedMemberRow from '@/components/community/ApprovedMemberRow'
import ImageUploadField from '@/components/community/ImageUploadField'
import PostCard from '@/components/community/PostCard'
import PostFilterBar from '@/components/community/PostFilterBar'
import CreatePostModal from '@/components/community/CreatePostModal'
import BlogCard from '@/components/community/BlogCard'
import ChatPanel from '@/components/community/ChatPanel'
import SearchPanel from '@/components/community/SearchPanel'

/**
 * A single community's room. Owns the join/leave/pending-approval flow,
 * the moderator pending-requests queue, and — as of Phase 2 — the post
 * feed itself (room shares, help requests, vents, polls), delegated to
 * `PostFeed` below once the caller is an APPROVED member. As of
 * Phase 4, an APPROVED member also gets a "Posts / Blog / Chat" tab
 * switcher; the blog tab delegates to `BlogFeed` below, which links out
 * to the full composer/reader pages rather than rendering long-form
 * content inline in the feed. As of Phase 6, the chat tab renders
 * `ChatPanel` directly inline (no separate page — chat is meant to be
 * glanced at alongside the rest of the room, unlike a blog post). As
 * of the v2-backlog search pass, `SearchPanel` sits above the tab
 * switcher rather than being its own tab — a search hit can be either
 * a post or a blog post, so it isn't owned by any one tab.
 * <p>
 * Route: `/community/:slug` (see `AppRouter.tsx`). `useMembers` for the
 * PENDING queue is only mounted when `callerRole` already qualifies —
 * the backend would 403 a plain member's request anyway, so there's no
 * reason to even issue it.
 */
function CommunityRoomPage() {
  const { slug } = useParams<{ slug: string }>()
  const { currentUser } = useAuth()
  const { community, loading, error, reload, join, leave, update, actionPending, actionError, dismissActionError } =
    useCommunity(slug ?? '')
  const [activeTab, setActiveTab] = useState<'posts' | 'blog' | 'chat'>('posts')

  const canModerate = community?.callerRole === 'MODERATOR' || community?.callerRole === 'ADMIN'

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="animate-pulse rounded-[2.5rem] border border-white/50 bg-white/35 p-10" aria-busy="true" />
      </div>
    )
  }

  if (error || !community) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <CommunityErrorState message={error ?? 'Community not found.'} onRetry={reload} />
      </div>
    )
  }

  return (
    <div className="cat-cursor mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link to="/community" className="font-body text-sm text-ink/50 hover:text-ink/80">
        ← All communities
      </Link>

      <FadeInSection className="mt-4">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-white/70 via-white/45 to-taro-light/30 p-8 shadow-[0_24px_70px_-22px_rgba(168,106,138,0.5)] backdrop-blur-xl">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full bg-blush-light/50 blur-3xl"
          />
          <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-taro-light to-blush-light text-2xl shadow-inner ring-1 ring-white/70">
                {community.iconUrl ? (
                  <img src={community.iconUrl} alt="" className="h-full w-full rounded-2xl object-cover" />
                ) : (
                  <span aria-hidden="true">{community.visibility === 'PRIVATE' ? '🔒' : '🌸'}</span>
                )}
              </div>
              <div>
                <h1 className="font-display text-2xl font-semibold leading-tight text-ink sm:text-[1.75rem]">
                  {community.name}
                </h1>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-body text-xs text-ink/50">
                  <span className="font-semibold text-ink/70">{community.memberCount}</span>
                  <span>member{community.memberCount === 1 ? '' : 's'}</span>
                  <span className="text-ink/25">·</span>
                  <span>{community.visibility === 'PRIVATE' ? '🔒 Private' : 'Public'}</span>
                  {community.callerRole && (
                    <>
                      <span className="text-ink/25">·</span>
                      <span className="rounded-full bg-taro/10 px-2 py-0.5 font-semibold text-taro-dark">
                        {roleLabel(community.callerRole)}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <MembershipCta
              community={community}
              actionPending={actionPending}
              onJoin={join}
              onLeave={leave}
            />
          </div>

          {community.description && (
            <p className="relative mt-6 max-w-xl font-body text-sm leading-relaxed text-ink/70">
              {community.description}
            </p>
          )}
        </div>
      </FadeInSection>

      {community.callerStatus === 'PENDING' && (
        <FadeInSection delay={0.05} className="mt-4">
          <div className="rounded-2xl border border-butter/60 bg-butter/40 px-5 py-4 font-body text-sm text-berry">
            Your request to join is pending approval from a moderator.
          </div>
        </FadeInSection>
      )}

      {canModerate && <PendingQueue slug={community.slug} />}

      {community.callerRole === 'ADMIN' && (
        <EditCommunityPanel community={community} update={update} />
      )}

      {canModerate && <ManageMembersPanel slug={community.slug} isCallerAdmin={community.callerRole === 'ADMIN'} />}

      {canModerate && (
        <FadeInSection delay={0.09} className="mt-4">
          <Link
            to={`/community/${community.slug}/reports`}
            className="font-body text-sm font-semibold text-taro-dark hover:text-taro"
          >
            🚩 Review reports →
          </Link>
        </FadeInSection>
      )}

      {community.callerStatus === 'APPROVED' ? (
        <>
          <FadeInSection delay={0.07} className="mt-6">
            <SearchPanel slug={community.slug} />
          </FadeInSection>

          <FadeInSection delay={0.08} className="mt-4">
            <div className="inline-flex gap-1 rounded-full border border-white/60 bg-white/50 p-1 shadow-sm">
              {(
                [
                  { key: 'posts', label: 'Posts', icon: '📝' },
                  { key: 'blog', label: 'Blog', icon: '📖' },
                  { key: 'chat', label: 'Chat', icon: '💬' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex items-center gap-1.5 rounded-full px-5 py-2 font-body text-sm font-semibold transition-colors ${
                    activeTab === tab.key ? 'text-white' : 'text-ink/50 hover:text-ink/80'
                  }`}
                >
                  {activeTab === tab.key && (
                    <motion.span
                      layoutId="room-tab-pill"
                      className="absolute inset-0 rounded-full bg-taro shadow-sm shadow-taro/40"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative text-xs">{tab.icon}</span>
                  <span className="relative">{tab.label}</span>
                </button>
              ))}
            </div>
          </FadeInSection>

          {activeTab === 'posts' && <PostFeed slug={community.slug} canModerate={canModerate} />}
          {activeTab === 'blog' && <BlogFeed slug={community.slug} />}
          {activeTab === 'chat' && (
            <FadeInSection delay={0.1} className="mt-6">
              <ChatPanel communityId={community.id} slug={community.slug} currentUid={currentUser?.uid ?? null} />
            </FadeInSection>
          )}
        </>
      ) : (
        community.callerStatus !== 'PENDING' && (
          <FadeInSection delay={0.1} className="mt-6">
            <div className="rounded-[2.5rem] border border-dashed border-white/60 bg-white/25 p-10 text-center backdrop-blur-xl">
              <p className="font-body text-sm text-ink/50">
                {community.visibility === 'PRIVATE'
                  ? 'Request access above to see posts and chat here.'
                  : 'Join above to see posts and chat here.'}
              </p>
            </div>
          </FadeInSection>
        )
      )}

      <div className="fixed inset-x-0 top-4 z-40 flex justify-center px-4">
        <Toast message={actionError} tone="error" onDismiss={dismissActionError} />
      </div>
    </div>
  )
}

function MembershipCta({
  community,
  actionPending,
  onJoin,
  onLeave,
}: {
  community: NonNullable<ReturnType<typeof useCommunity>['community']>
  actionPending: boolean
  onJoin: () => void
  onLeave: () => void
}) {
  if (community.callerStatus === 'APPROVED') {
    // The sole admin leaving is blocked server-side (SoleAdminCannotLeaveException);
    // the button stays enabled either way and the resulting error surfaces via Toast,
    // same pattern as every other server-enforced rule in this app.
    return (
      <button
        type="button"
        disabled={actionPending}
        onClick={onLeave}
        className="shrink-0 rounded-full border border-white/60 bg-white/70 px-6 py-2.5 font-body text-sm font-semibold text-ink/60 transition-colors hover:bg-white disabled:opacity-60"
      >
        {actionPending ? 'Leaving…' : 'Leave'}
      </button>
    )
  }

  if (community.callerStatus === 'PENDING') {
    return (
      <span className="shrink-0 rounded-full bg-butter px-6 py-2.5 font-body text-sm font-semibold text-berry">
        Pending
      </span>
    )
  }

  return (
    <button
      type="button"
      disabled={actionPending}
      onClick={() => {
        // Optimistic and decorative, not a success confirmation — see
        // playMeow's javadoc for why this doesn't wait on the request
        // to resolve first.
        playMeow()
        onJoin()
      }}
      className="cat-ears relative shrink-0 rounded-full bg-taro px-6 py-2.5 font-body text-sm font-semibold text-white shadow-lg shadow-taro/30 transition-colors hover:bg-taro-dark disabled:opacity-60"
    >
      {actionPending ? 'Sending…' : community.visibility === 'PRIVATE' ? 'Request access' : 'Join'}
    </button>
  )
}

function PendingQueue({ slug }: { slug: string }) {
  const { members, loading, error, approve, reject, decidingUid } = useMembers(slug, 'PENDING')

  if (loading || error || members.length === 0) {
    return null
  }

  return (
    <FadeInSection delay={0.08} className="mt-4">
      <div className="rounded-[2rem] border border-white/50 bg-white/40 p-6 backdrop-blur-xl">
        <h2 className="font-display text-sm font-semibold text-ink">
          Pending requests ({members.length})
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          {members.map((membership) => (
            <MemberRow
              key={membership.id}
              membership={membership}
              deciding={decidingUid === membership.userUid}
              onApprove={() => approve(membership.userUid)}
              onReject={() => reject(membership.userUid)}
            />
          ))}
        </div>
      </div>
    </FadeInSection>
  )
}

/**
 * "Edit community" — v2 backlog, admin-only. Collapsed by default,
 * same reasoning `ManageMembersPanel` gives for its own collapse: this
 * is a secondary tool that shouldn't push the feed down on every room
 * visit. Reuses `ImageUploadField` for the icon (see that component
 * and `backend/firebase/storage.rules` — uploads here don't yet have
 * a `communityId`-scoped path the way blog covers do, so icon uploads
 * are keyed by uploader uid instead, same as at creation time).
 */
function EditCommunityPanel({
  community,
  update,
}: {
  community: Community
  update: (payload: UpdateCommunityRequest) => Promise<boolean>
}) {
  const { currentUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(community.name)
  const [description, setDescription] = useState(community.description ?? '')
  const [iconUrl, setIconUrl] = useState<string | null>(community.iconUrl)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    const ok = await update({
      name: name.trim() || undefined,
      description: description.trim() ? description.trim() : null,
      iconUrl,
    })
    setSaving(false)
    if (!ok) setSaveError("Couldn't save those changes right now.")
  }

  return (
    <FadeInSection delay={0.08} className="mt-4">
      <div className="rounded-[2rem] border border-white/50 bg-white/40 p-6 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="font-display text-sm font-semibold text-ink"
        >
          Edit community {open ? '▲' : '▼'}
        </button>

        {open && (
          <div className="mt-4 flex flex-col gap-4">
            <ImageUploadField
              label="Icon"
              value={iconUrl}
              onChange={setIconUrl}
              previewClassName="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br from-taro-light to-blush-light"
              buildPath={(file) => {
                const uid = currentUser?.uid ?? 'unknown'
                const ext = file.name.split('.').pop() ?? 'jpg'
                return `community-icons/${uid}/${Date.now()}.${ext}`
              }}
            />

            <div>
              <label htmlFor="edit-community-name" className="font-body text-xs font-semibold text-ink/60">
                Name
              </label>
              <input
                id="edit-community-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                className="mt-1 w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-2 font-body text-sm text-ink outline-none focus:border-taro"
              />
            </div>

            <div>
              <label htmlFor="edit-community-description" className="font-body text-xs font-semibold text-ink/60">
                Description
              </label>
              <textarea
                id="edit-community-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
                rows={3}
                className="mt-1 w-full resize-none rounded-2xl border border-white/60 bg-white/70 px-4 py-2 font-body text-sm text-ink outline-none focus:border-taro"
              />
            </div>

            {saveError && <p className="font-body text-xs text-berry">{saveError}</p>}

            <button
              type="button"
              disabled={saving || !name.trim()}
              onClick={handleSave}
              className="self-start rounded-full bg-taro px-5 py-2 font-body text-sm font-semibold text-white shadow-sm shadow-taro/30 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>
    </FadeInSection>
  )
}

/**
 * "Manage members" — Community Rooms, Phase 5 follow-up. Collapsed by
 * default (`open` state) since it's a secondary moderator tool, not
 * something that should push the post feed down every time a
 * moderator opens the room. Role changes only render their dropdown
 * for an ADMIN caller (see `ApprovedMemberRow`'s javadoc); ban is
 * available to any moderator/admin, matching the backend gate.
 */
function ManageMembersPanel({ slug, isCallerAdmin }: { slug: string; isCallerAdmin: boolean }) {
  const { currentUser } = useAuth()
  const [open, setOpen] = useState(false)
  const { members, loading, error, changeRole, ban, decidingUid } = useMembers(slug, 'APPROVED')

  return (
    <FadeInSection delay={0.08} className="mt-4">
      <div className="rounded-[2rem] border border-white/50 bg-white/40 p-6 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="font-display text-sm font-semibold text-ink"
        >
          Manage members {open ? '▲' : '▼'}
        </button>

        {open && (
          <div className="mt-3 flex flex-col gap-2">
            {loading && <p className="font-body text-xs text-ink/40">Loading members…</p>}
            {!loading && error && <p className="font-body text-xs text-berry">{error}</p>}
            {!loading &&
              !error &&
              members.map((membership) => (
                <ApprovedMemberRow
                  key={membership.id}
                  membership={membership}
                  currentUid={currentUser?.uid ?? null}
                  isCallerAdmin={isCallerAdmin}
                  deciding={decidingUid === membership.userUid}
                  onChangeRole={(role) => changeRole(membership.userUid, role)}
                  onBan={() => ban(membership.userUid)}
                />
              ))}
          </div>
        )}
      </div>
    </FadeInSection>
  )
}

/**
 * The post feed for one APPROVED member — Community Rooms, Phase 2.
 * Owns the type/sort filter state and the create-post modal; per-post
 * actions (vote, pin, resolve, delete) delegate straight to `usePosts`'
 * mutations, which patch the affected post in place rather than
 * re-fetching the whole feed.
 */
function PostFeed({ slug, canModerate }: { slug: string; canModerate: boolean }) {
  const { currentUser } = useAuth()
  const [type, setType] = useState<PostType | undefined>(undefined)
  const [sort, setSort] = useState<PostSort>('new')
  const [composerOpen, setComposerOpen] = useState(false)

  const {
    posts,
    loading,
    error,
    reload,
    create,
    remove,
    togglePin,
    toggleResolved,
    vote,
    toggleUpvote,
    actionPendingId,
    actionError,
    dismissActionError,
  } = usePosts(slug, { type, sort })

  return (
    <FadeInSection delay={0.1} className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <PostFilterBar type={type} sort={sort} onTypeChange={setType} onSortChange={setSort} />
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          className="shrink-0 rounded-full bg-taro px-5 py-2 font-body text-sm font-semibold text-white shadow-lg shadow-taro/30 transition-colors hover:bg-taro-dark"
        >
          + New post
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {loading && (
          <div className="animate-pulse rounded-[2rem] border border-white/50 bg-white/35 p-8" aria-busy="true" />
        )}

        {!loading && error && <CommunityErrorState message={error} onRetry={reload} />}

        {!loading && !error && posts.length === 0 && (
          <div className="rounded-[2.5rem] border border-dashed border-white/60 bg-white/25 p-10 text-center backdrop-blur-xl">
            <p className="font-body text-sm text-ink/50">
              Nothing here yet — be the first to post{type ? ' in this category' : ''}.
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              slug={slug}
              currentUid={currentUser?.uid ?? null}
              canModerate={canModerate}
              actionPending={actionPendingId === post.id}
              onVote={(optionId) => vote(post.id, optionId)}
              onToggleUpvote={() => toggleUpvote(post.id)}
              onTogglePin={() => togglePin(post.id)}
              onToggleResolved={() => toggleResolved(post.id)}
              onDelete={() => remove(post.id)}
            />
          ))}
      </div>

      {composerOpen && (
        <CreatePostModal
          submitting={actionPendingId === 'create'}
          error={actionError}
          onSubmit={create}
          onClose={() => setComposerOpen(false)}
        />
      )}

      <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
        <Toast message={actionError} tone="error" onDismiss={dismissActionError} />
      </div>
    </FadeInSection>
  )
}

/**
 * The blog tab for one APPROVED member — Community Rooms, Phase 4.
 * Shows either the published feed or the caller's own drafts+published
 * posts ("Mine" toggle), and links out to `/community/:slug/blog/new`
 * for writing rather than composing inline — long-form content gets
 * its own page, same reasoning `BlogEditor`'s javadoc gives for why
 * this isn't squeezed into a modal.
 */
function BlogFeed({ slug }: { slug: string }) {
  const [scope, setScope] = useState<'published' | 'mine'>('published')
  const { posts, loading, error, reload } = useBlogPosts(slug, scope)

  return (
    <FadeInSection delay={0.1} className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex gap-1 rounded-full border border-white/60 bg-white/50 p-1">
          {(['published', 'mine'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`relative rounded-full px-4 py-1.5 font-body text-xs font-semibold transition-colors ${
                scope === s ? 'text-white' : 'text-ink/50 hover:text-ink/80'
              }`}
            >
              {scope === s && (
                <motion.span
                  layoutId="blog-scope-pill"
                  className="absolute inset-0 rounded-full bg-taro shadow-sm shadow-taro/40"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative">{s === 'published' ? 'Published' : 'My drafts'}</span>
            </button>
          ))}
        </div>
        <Link
          to={`/community/${slug}/blog/new`}
          className="cat-ears relative shrink-0 rounded-full bg-taro px-5 py-2 font-body text-sm font-semibold text-white shadow-lg shadow-taro/30 transition-colors hover:bg-taro-dark"
        >
          + Write
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {loading && (
          <div className="animate-pulse rounded-[2rem] border border-white/50 bg-white/35 p-8" aria-busy="true" />
        )}

        {!loading && error && <CommunityErrorState message={error} onRetry={reload} />}

        {!loading && !error && posts.length === 0 && (
          <div className="rounded-[2.5rem] border border-dashed border-white/60 bg-white/25 p-10 text-center backdrop-blur-xl">
            <p className="font-body text-sm text-ink/50">
              {scope === 'mine' ? "You haven't written anything here yet." : 'No posts here yet — write the first one.'}
            </p>
          </div>
        )}

        {!loading && !error && posts.map((post) => <BlogCard key={post.id} post={post} slug={slug} />)}
      </div>
    </FadeInSection>
  )
}

function roleLabel(role: string): string {
  if (role === 'ADMIN') return 'an admin'
  if (role === 'MODERATOR') return 'a moderator'
  return 'a member'
}

export default CommunityRoomPage
