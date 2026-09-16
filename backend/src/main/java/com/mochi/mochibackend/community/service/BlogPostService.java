package com.mochi.mochibackend.community.service;

import com.mochi.mochibackend.community.dto.CreateBlogPostRequest;
import com.mochi.mochibackend.community.dto.UpdateBlogPostRequest;
import com.mochi.mochibackend.community.entity.BlogPost;
import com.mochi.mochibackend.community.entity.Community;
import com.mochi.mochibackend.community.entity.CommunityMembership;
import com.mochi.mochibackend.community.enums.BlogStatus;
import com.mochi.mochibackend.community.enums.MembershipRole;
import com.mochi.mochibackend.community.repository.BlogPostRepository;
import com.mochi.mochibackend.exception.BlogPostNotFoundException;
import com.mochi.mochibackend.exception.InvalidBlogPostRequestException;
import com.mochi.mochibackend.exception.NotBlogAuthorException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Locale;

/**
 * Community Rooms, Phase 4: long-form blog posts. Same layering every
 * other service in this package follows relative to
 * {@code CommunityService} — every mutation resolves the caller's
 * membership standing first — plus an author-only gate on top for
 * edit/publish/unpublish/delete, since (unlike a short post) a blog
 * post's draft state means "not everyone gets to touch this," not just
 * "not everyone gets to edit this."
 * <p>
 * {@code getPublishedBlogPostInCommunity} and
 * {@code adjustCommentCount}/{@code adjustUpvoteCount} are public on
 * purpose — {@code CommentService}/{@code ReactionService} reuse them
 * rather than re-deriving "does this blog post exist and can comments
 * target it," same reasoning {@code PostService.getPostInCommunity} is
 * public for the short-post equivalent.
 */
@Service
public class BlogPostService {

    private static final int WORDS_PER_MINUTE = 200;
    private static final int MIN_READING_TIME_MINUTES = 1;

    private final BlogPostRepository blogPostRepository;
    private final CommunityService communityService;
    private final Clock clock;

    public BlogPostService(BlogPostRepository blogPostRepository, CommunityService communityService, Clock clock) {
        this.blogPostRepository = blogPostRepository;
        this.communityService = communityService;
        this.clock = clock;
    }

    /** Always creates a DRAFT — publishing is a separate, explicit action. Caller must be an APPROVED member. */
    @Transactional
    public BlogPost create(String userUid, String slug, CreateBlogPostRequest request) {
        Community community = communityService.getBySlug(slug);
        communityService.requireApprovedMembership(community, userUid);
        requireNonBlank(request.getBody(), "Body is required");

        BlogPost blogPost = new BlogPost();
        blogPost.setCommunityId(community.getId());
        blogPost.setAuthorUid(userUid);
        blogPost.setSlug(generateUniqueSlug(community.getId(), request.getTitle()));
        blogPost.setTitle(request.getTitle());
        blogPost.setCoverImageUrl(request.getCoverImageUrl());
        applyBody(blogPost, request.getBody());
        blogPost.setStatus(BlogStatus.DRAFT);

        return blogPostRepository.save(blogPost);
    }

    /**
     * Author-only edit of title/cover/body. Allowed in both DRAFT and
     * PUBLISHED status — there's no "lock after publish" rule here.
     * The slug is intentionally immutable after creation (unlike the
     * community slug, which can be chosen up front) — a published
     * post's URL shouldn't shift under a reader who bookmarked it.
     */
    @Transactional
    public BlogPost update(String userUid, String slug, Long blogPostId, UpdateBlogPostRequest request) {
        Community community = communityService.getBySlug(slug);
        communityService.requireApprovedMembership(community, userUid);
        BlogPost blogPost = requireBlogPost(community.getId(), blogPostId);
        requireAuthor(userUid, blogPost);

        if (StringUtils.hasText(request.getTitle())) {
            blogPost.setTitle(request.getTitle());
        }
        if (request.getCoverImageUrl() != null) {
            blogPost.setCoverImageUrl(request.getCoverImageUrl());
        }
        if (StringUtils.hasText(request.getBody())) {
            applyBody(blogPost, request.getBody());
        }

        return blogPostRepository.save(blogPost);
    }

    /** Author-only. No-op (returns the post unchanged) if already PUBLISHED — this is a "make it live" action, not a toggle. */
    @Transactional
    public BlogPost publish(String userUid, String slug, Long blogPostId) {
        Community community = communityService.getBySlug(slug);
        communityService.requireApprovedMembership(community, userUid);
        BlogPost blogPost = requireBlogPost(community.getId(), blogPostId);
        requireAuthor(userUid, blogPost);

        if (blogPost.getStatus() == BlogStatus.PUBLISHED) {
            return blogPost;
        }

        if (!StringUtils.hasText(blogPost.getTitle()) || !StringUtils.hasText(blogPost.getBody())) {
            throw new InvalidBlogPostRequestException("A blog post needs a title and a body before it can be published");
        }

        blogPost.setStatus(BlogStatus.PUBLISHED);
        if (blogPost.getPublishedAt() == null) {
            blogPost.setPublishedAt(Instant.now(clock));
        }
        return blogPostRepository.save(blogPost);
    }

    /** Author-only. Pulls a PUBLISHED post back to DRAFT; {@code publishedAt} is left as-is (see {@link BlogPost#getPublishedAt()}'s javadoc). */
    @Transactional
    public BlogPost unpublish(String userUid, String slug, Long blogPostId) {
        Community community = communityService.getBySlug(slug);
        communityService.requireApprovedMembership(community, userUid);
        BlogPost blogPost = requireBlogPost(community.getId(), blogPostId);
        requireAuthor(userUid, blogPost);

        blogPost.setStatus(BlogStatus.DRAFT);
        return blogPostRepository.save(blogPost);
    }

    /** Delete — the author, or any moderator/admin (moderation removal), same policy as {@code PostService.delete}. */
    @Transactional
    public void delete(String userUid, String slug, Long blogPostId) {
        Community community = communityService.getBySlug(slug);
        CommunityMembership caller = communityService.requireApprovedMembership(community, userUid);
        BlogPost blogPost = requireBlogPost(community.getId(), blogPostId);

        boolean isAuthor = blogPost.getAuthorUid().equals(userUid);
        boolean isModOrAdmin = caller.getRole() == MembershipRole.MODERATOR || caller.getRole() == MembershipRole.ADMIN;
        if (!isAuthor && !isModOrAdmin) {
            throw new NotBlogAuthorException("Only the author or a moderator can remove this blog post");
        }

        blogPostRepository.delete(blogPost);
    }

    /**
     * Fetches one blog post by id. A DRAFT is only visible to its
     * author or a moderator/admin (for moderation review) — every
     * other approved member gets {@code BlogPostNotFoundException},
     * same "don't reveal existence" shape {@code PostService} doesn't
     * need but a draft genuinely does.
     */
    @Transactional(readOnly = true)
    public BlogPost get(String userUid, String slug, Long blogPostId) {
        Community community = communityService.getBySlug(slug);
        CommunityMembership caller = communityService.requireApprovedMembership(community, userUid);
        BlogPost blogPost = requireBlogPost(community.getId(), blogPostId);

        if (blogPost.getStatus() == BlogStatus.DRAFT && !canViewDraft(userUid, caller, blogPost)) {
            throw new BlogPostNotFoundException("Blog post not found");
        }

        return blogPost;
    }

    /** The public feed: published posts, newest-first by publish date. Caller must be an APPROVED member. */
    @Transactional(readOnly = true)
    public List<BlogPost> listPublished(String userUid, String slug) {
        Community community = communityService.getBySlug(slug);
        communityService.requireApprovedMembership(community, userUid);
        return blogPostRepository.findAllByCommunityIdAndStatusOrderByPublishedAtDesc(community.getId(), BlogStatus.PUBLISHED);
    }

    /** The caller's own posts (drafts + published) — "My drafts" view. Caller must be an APPROVED member. */
    @Transactional(readOnly = true)
    public List<BlogPost> listMine(String userUid, String slug) {
        Community community = communityService.getBySlug(slug);
        communityService.requireApprovedMembership(community, userUid);
        return blogPostRepository.findAllByCommunityIdAndAuthorUidOrderByCreatedAtDesc(community.getId(), userUid);
    }

    // ------------------------------------------------------------------

    /**
     * Public on purpose: {@code CommentService}/{@code ReactionService}
     * reuse this rather than re-deriving "does this blog post exist and
     * can it be commented on/reacted to." Only PUBLISHED posts are
     * valid targets — commenting on a draft isn't a supported flow, so
     * this throws the same not-found exception a nonexistent id would.
     */
    @Transactional(readOnly = true)
    public BlogPost getPublishedBlogPostInCommunity(Community community, Long blogPostId) {
        BlogPost blogPost = requireBlogPost(community.getId(), blogPostId);
        if (blogPost.getStatus() != BlogStatus.PUBLISHED) {
            throw new BlogPostNotFoundException("Blog post not found");
        }
        return blogPost;
    }

    /** Applies {@code delta} to a blog post's denormalized upvote counter. Never goes negative. */
    @Transactional
    public void adjustUpvoteCount(BlogPost blogPost, int delta) {
        blogPost.setUpvoteCount(Math.max(0, blogPost.getUpvoteCount() + delta));
        blogPostRepository.save(blogPost);
    }

    /** Applies {@code delta} to a blog post's denormalized comment counter. Never goes negative. */
    @Transactional
    public void adjustCommentCount(BlogPost blogPost, int delta) {
        blogPost.setCommentCount(Math.max(0, blogPost.getCommentCount() + delta));
        blogPostRepository.save(blogPost);
    }

    // ------------------------------------------------------------------

    private boolean canViewDraft(String userUid, CommunityMembership caller, BlogPost blogPost) {
        if (blogPost.getAuthorUid().equals(userUid)) {
            return true;
        }
        return caller.getRole() == MembershipRole.MODERATOR || caller.getRole() == MembershipRole.ADMIN;
    }

    private void requireAuthor(String userUid, BlogPost blogPost) {
        if (!blogPost.getAuthorUid().equals(userUid)) {
            throw new NotBlogAuthorException("Only the author can do this");
        }
    }

    private BlogPost requireBlogPost(Long communityId, Long blogPostId) {
        return blogPostRepository.findByIdAndCommunityId(blogPostId, communityId)
                .orElseThrow(() -> new BlogPostNotFoundException("Blog post not found"));
    }

    private void requireNonBlank(String value, String message) {
        if (!StringUtils.hasText(value)) {
            throw new InvalidBlogPostRequestException(message);
        }
    }

    /** Sets {@code body}, and recomputes {@code bodyPlaintext}/{@code readingTimeMinutes} from it — see the {@code V20} migration's header comment on why both are stored rather than derived on read. */
    private void applyBody(BlogPost blogPost, String body) {
        blogPost.setBody(body);
        String plaintext = stripMarkup(body);
        blogPost.setBodyPlaintext(plaintext);
        blogPost.setReadingTimeMinutes(computeReadingTimeMinutes(plaintext));
    }

    /**
     * Strips the editor's lightweight markup (Markdown-style
     * heading/emphasis/list characters and any stray HTML-like tags)
     * down to plain text, for the excerpt and the future FULLTEXT
     * index. Deliberately simple — this doesn't need to be a full
     * Markdown parser, just good enough that headings/emphasis
     * characters don't leak into an excerpt.
     */
    private String stripMarkup(String body) {
        if (body == null) {
            return "";
        }
        return body
                .replaceAll("<[^>]*>", " ")
                .replaceAll("(?m)^#{1,6}\\s*", "")
                .replaceAll("[*_`>#-]", " ")
                .replaceAll("\\[(.*?)\\]\\([^)]*\\)", "$1")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private int computeReadingTimeMinutes(String plaintext) {
        if (!StringUtils.hasText(plaintext)) {
            return MIN_READING_TIME_MINUTES;
        }
        int wordCount = plaintext.trim().split("\\s+").length;
        int minutes = (int) Math.ceil(wordCount / (double) WORDS_PER_MINUTE);
        return Math.max(MIN_READING_TIME_MINUTES, minutes);
    }

    /** Derives a URL-safe per-community slug from a title, appending -2, -3, ... on collision — same recipe as {@code CommunityService.generateUniqueSlug}, scoped to one community instead of globally. */
    private String generateUniqueSlug(Long communityId, String title) {
        String base = title.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+)|(-+$)", "");
        if (!StringUtils.hasText(base)) {
            base = "post";
        }
        if (base.length() > 180) {
            base = base.substring(0, 180);
        }

        String candidate = base;
        int suffix = 2;
        while (blogPostRepository.existsByCommunityIdAndSlug(communityId, candidate)) {
            candidate = base + "-" + suffix;
            suffix++;
        }
        return candidate;
    }
}
