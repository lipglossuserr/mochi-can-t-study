import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCommunitySearch } from '@/features/community'
import type { SearchResult } from '@/features/community'

interface SearchPanelProps {
  slug: string
}

/**
 * Collapsible search — Community Rooms, v2 backlog. Sits above the
 * Posts/Blog/Chat tabs rather than being its own tab, since a search
 * hit can be either a post or a blog post and picking one tab to own
 * it would be arbitrary.
 * <p>
 * Both post and blog-post hits are real links now — post hits go to
 * `PostDetailPage` (`/community/:slug/posts/:id`), added specifically
 * to close the gap this panel originally shipped with (post hits had
 * nowhere to link to; see `PostDetailPage`'s javadoc).
 */
function SearchPanel({ slug }: SearchPanelProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { results, loading, error } = useCommunitySearch(slug, open ? query : '')

  const hasResults = results.posts.length > 0 || results.blogPosts.length > 0
  const trimmedLength = query.trim().length

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="font-body text-sm font-semibold text-taro-dark hover:text-taro"
      >
        🔍 Search this community
      </button>

      {open && (
        <div className="mt-2 rounded-[2rem] border border-white/50 bg-white/45 p-5 backdrop-blur-xl">
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search posts and blog posts…"
            className="w-full rounded-full border border-white/60 bg-white/70 px-4 py-2 font-body text-sm text-ink outline-none focus:border-taro"
          />

          <div className="mt-3 flex flex-col gap-4">
            {trimmedLength > 0 && trimmedLength < 2 && (
              <p className="font-body text-xs text-ink/40">Keep typing — search needs at least 2 characters.</p>
            )}

            {loading && <p className="font-body text-xs text-ink/40">Searching…</p>}
            {!loading && error && <p className="font-body text-xs text-berry">{error}</p>}

            {!loading && !error && trimmedLength >= 2 && !hasResults && (
              <p className="font-body text-xs text-ink/40">No results for "{query.trim()}".</p>
            )}

            {!loading && !error && results.blogPosts.length > 0 && (
              <div>
                <p className="font-body text-xs font-semibold text-ink/50">Blog posts</p>
                <div className="mt-1.5 flex flex-col gap-2">
                  {results.blogPosts.map((hit) => (
                    <SearchHitCard key={`blog-${hit.id}`} hit={hit} to={`/community/${slug}/blog/${hit.id}`} />
                  ))}
                </div>
              </div>
            )}

            {!loading && !error && results.posts.length > 0 && (
              <div>
                <p className="font-body text-xs font-semibold text-ink/50">Posts</p>
                <div className="mt-1.5 flex flex-col gap-2">
                  {results.posts.map((hit) => (
                    <SearchHitCard key={`post-${hit.id}`} hit={hit} to={`/community/${slug}/posts/${hit.id}`} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SearchHitCard({ hit, to }: { hit: SearchResult; to?: string }) {
  const content = (
    <div className="rounded-2xl border border-white/50 bg-white/60 px-4 py-2.5">
      <div className="flex items-center gap-2">
        {hit.postType && (
          <span className="rounded-full bg-taro/15 px-2 py-0.5 font-body text-[10px] font-semibold text-taro-dark">
            {hit.postType}
          </span>
        )}
        <p className="font-body text-sm font-semibold text-ink">{hit.title}</p>
      </div>
      {hit.snippet && <p className="mt-0.5 line-clamp-2 font-body text-xs text-ink/55">{hit.snippet}</p>}
    </div>
  )

  return to ? (
    <Link to={to} className="block hover:opacity-80">
      {content}
    </Link>
  ) : (
    content
  )
}

export default SearchPanel
