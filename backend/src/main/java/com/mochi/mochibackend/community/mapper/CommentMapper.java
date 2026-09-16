package com.mochi.mochibackend.community.mapper;

import com.mochi.mochibackend.community.dto.CommentResponse;
import com.mochi.mochibackend.community.entity.Comment;
import org.springframework.stereotype.Component;

/** Entity -> DTO mapping for comments. Entities are never exposed from controllers, matching {@code PostMapper}/{@code CommunityMapper}. */
@Component
public class CommentMapper {

    public CommentResponse toResponse(Comment comment, boolean callerUpvoted) {
        return new CommentResponse(
                comment.getId(),
                comment.getPostId(),
                comment.getBlogPostId(),
                comment.getParentCommentId(),
                comment.getAuthorUid(),
                comment.getBody(),
                comment.getUpvoteCount(),
                callerUpvoted,
                comment.getCreatedAt(),
                comment.getUpdatedAt()
        );
    }
}
