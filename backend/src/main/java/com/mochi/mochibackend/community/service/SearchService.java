package com.mochi.mochibackend.community.service;

import com.mochi.mochibackend.community.dto.SearchResponse;
import com.mochi.mochibackend.community.dto.SearchResultResponse;
import com.mochi.mochibackend.community.entity.BlogPost;
import com.mochi.mochibackend.community.entity.Community;
import com.mochi.mochibackend.community.entity.Post;
import com.mochi.mochibackend.community.repository.BlogPostRepository;
import com.mochi.mochibackend.community.repository.PostRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Community Rooms, v2 backlog: search. See the {@code V23} migration's
 * header comment for why this is a plain MySQL FULLTEXT index rather
 * than a dedicated search service (Meilisearch/Algolia) — the design
 * doc calls the FULLTEXT approach "genuinely sufficient at this scale"
 * and explicitly not premature, unlike the search-service upgrade and
 * the Perspective API moderation pre-screen, both of which stay
 * deferred until real usage data justifies them.
 * <p>
 * Requires APPROVED membership (same gate every read in this package
 * uses) — search doesn't leak community content to non-members. A
 * query under 2 characters short-circuits to empty results without
 * touching the database: MySQL's default FULLTEXT minimum word length
 * is 4 characters in InnoDB, so anything shorter would silently match
 * nothing anyway; failing fast here saves a wasted round trip and
 * keeps that MySQL-configuration detail from leaking into the
 * behavior a caller sees.
 */
@Service
public class SearchService {

    private static final int MIN_QUERY_LENGTH = 2;
    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 50;
    private static final int SNIPPET_LENGTH = 160;

    private final CommunityService communityService;
    private final PostRepository postRepository;
    private final BlogPostRepository blogPostRepository;

    public SearchService(CommunityService communityService, PostRepository postRepository, BlogPostRepository blogPostRepository) {
        this.communityService = communityService;
        this.postRepository = postRepository;
        this.blogPostRepository = blogPostRepository;
    }

    @Transactional(readOnly = true)
    public SearchResponse search(String userUid, String slug, String query, Integer requestedLimit) {
        Community community = communityService.getBySlug(slug);
        communityService.requireApprovedMembership(community, userUid);

        String trimmed = query == null ? "" : query.trim();
        if (trimmed.length() < MIN_QUERY_LENGTH) {
            return new SearchResponse(List.of(), List.of());
        }

        int limit = clampLimit(requestedLimit);

        List<SearchResultResponse> posts = postRepository.searchByCommunity(community.getId(), trimmed, limit).stream()
                .map(this::toSearchResult)
                .toList();

        List<SearchResultResponse> blogPosts = blogPostRepository.searchByCommunity(community.getId(), trimmed, limit).stream()
                .map(this::toSearchResult)
                .toList();

        return new SearchResponse(posts, blogPosts);
    }

    private SearchResultResponse toSearchResult(Post post) {
        return new SearchResultResponse(
                "POST", post.getId(), post.getTitle(), snippetOf(post.getBody()), post.getType().name(), post.getCreatedAt());
    }

    private SearchResultResponse toSearchResult(BlogPost blogPost) {
        return new SearchResultResponse(
                "BLOG_POST", blogPost.getId(), blogPost.getTitle(), snippetOf(blogPost.getBodyPlaintext()), null, blogPost.getCreatedAt());
    }

    /** A short plain-text excerpt for the results list — same truncate-and-ellipsize approach {@code BlogPostMapper.excerptOf} uses, not a match-highlighted snippet (MySQL FULLTEXT doesn't hand back match positions in NATURAL LANGUAGE MODE). */
    private String snippetOf(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        String trimmed = text.trim();
        if (trimmed.length() <= SNIPPET_LENGTH) {
            return trimmed;
        }
        return trimmed.substring(0, SNIPPET_LENGTH).trim() + "…";
    }

    private int clampLimit(Integer requested) {
        if (requested == null || requested <= 0) {
            return DEFAULT_LIMIT;
        }
        return Math.min(requested, MAX_LIMIT);
    }
}
