package com.mochi.mochibackend.community.mapper;

import com.mochi.mochibackend.community.dto.BlogPostResponse;
import com.mochi.mochibackend.community.entity.BlogPost;
import org.springframework.stereotype.Component;

/**
 * Entity -&gt; DTO mapping for blog posts. Entities are never exposed
 * from controllers, matching {@code PostMapper}/{@code CommentMapper}.
 */
@Component
public class BlogPostMapper {

    private static final int EXCERPT_LENGTH = 220;

    /** Full view — body included, excerpt omitted. Used by the "get one" endpoint. */
    public BlogPostResponse toDetailResponse(BlogPost blogPost, boolean callerUpvoted, boolean callerIsAuthor) {
        return new BlogPostResponse(
                blogPost.getId(),
                blogPost.getCommunityId(),
                blogPost.getAuthorUid(),
                blogPost.getSlug(),
                blogPost.getTitle(),
                blogPost.getCoverImageUrl(),
                blogPost.getBody(),
                null,
                blogPost.getReadingTimeMinutes(),
                blogPost.getStatus().name(),
                blogPost.getUpvoteCount(),
                blogPost.getCommentCount(),
                callerUpvoted,
                callerIsAuthor,
                blogPost.getPublishedAt(),
                blogPost.getCreatedAt(),
                blogPost.getUpdatedAt()
        );
    }

    /** Summary view — excerpt included, body omitted. Used by feed/list endpoints. */
    public BlogPostResponse toSummaryResponse(BlogPost blogPost, boolean callerUpvoted, boolean callerIsAuthor) {
        return new BlogPostResponse(
                blogPost.getId(),
                blogPost.getCommunityId(),
                blogPost.getAuthorUid(),
                blogPost.getSlug(),
                blogPost.getTitle(),
                blogPost.getCoverImageUrl(),
                null,
                excerptOf(blogPost.getBodyPlaintext()),
                blogPost.getReadingTimeMinutes(),
                blogPost.getStatus().name(),
                blogPost.getUpvoteCount(),
                blogPost.getCommentCount(),
                callerUpvoted,
                callerIsAuthor,
                blogPost.getPublishedAt(),
                blogPost.getCreatedAt(),
                blogPost.getUpdatedAt()
        );
    }

    private String excerptOf(String plaintext) {
        if (plaintext == null || plaintext.isBlank()) {
            return "";
        }
        String trimmed = plaintext.trim();
        if (trimmed.length() <= EXCERPT_LENGTH) {
            return trimmed;
        }
        return trimmed.substring(0, EXCERPT_LENGTH).trim() + "…";
    }
}
