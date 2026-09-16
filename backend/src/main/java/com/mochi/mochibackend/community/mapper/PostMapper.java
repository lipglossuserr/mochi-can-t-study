package com.mochi.mochibackend.community.mapper;

import com.mochi.mochibackend.community.dto.PollOptionResponse;
import com.mochi.mochibackend.community.dto.PostResponse;
import com.mochi.mochibackend.community.entity.PollOption;
import com.mochi.mochibackend.community.entity.PollVote;
import com.mochi.mochibackend.community.entity.Post;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Entity -> DTO mapping for posts and poll options. Entities are never
 * exposed from controllers, matching {@code CommunityMapper}.
 */
@Component
public class PostMapper {

    /**
     * @param revealAuthor whether {@code authorUid} should be included in
     *                      the response — false hides it (anonymous post,
     *                      caller is neither the author nor a
     *                      moderator/admin); see {@code PostResponse}'s
     *                      javadoc for the reasoning.
     * @param pollOptions   options for this post, or empty for non-POLL types.
     * @param callerVote    the caller's own vote on this poll, if any.
     * @param callerUpvoted whether the caller has upvoted this post (Phase 3).
     */
    public PostResponse toResponse(
            Post post,
            boolean revealAuthor,
            List<PollOption> pollOptions,
            Optional<PollVote> callerVote,
            boolean callerUpvoted) {
        List<PollOptionResponse> optionResponses = pollOptions.isEmpty()
                ? null
                : pollOptions.stream()
                        .sorted(Comparator.comparingInt(PollOption::getDisplayOrder))
                        .map(o -> new PollOptionResponse(o.getId(), o.getLabel(), o.getVoteCount(), o.getDisplayOrder()))
                        .toList();

        return new PostResponse(
                post.getId(),
                post.getCommunityId(),
                revealAuthor ? post.getAuthorUid() : null,
                post.getType().name(),
                post.getTitle(),
                post.getBody(),
                post.isAnonymous(),
                post.isPinned(),
                post.isResolved(),
                post.getStudyRoomCode(),
                post.getStudyRoomExpiresAt(),
                post.getUpvoteCount(),
                post.getCommentCount(),
                callerUpvoted,
                optionResponses,
                callerVote.map(PollVote::getPollOptionId).orElse(null),
                post.getCreatedAt(),
                post.getUpdatedAt()
        );
    }
}
