package com.mochi.mochibackend.community.service;

import com.mochi.mochibackend.community.entity.Comment;
import com.mochi.mochibackend.community.entity.Community;
import com.mochi.mochibackend.community.entity.CommunityMembership;
import com.mochi.mochibackend.community.entity.Post;
import com.mochi.mochibackend.community.entity.Reaction;
import com.mochi.mochibackend.community.enums.CommunityVisibility;
import com.mochi.mochibackend.community.enums.MembershipRole;
import com.mochi.mochibackend.community.enums.MembershipStatus;
import com.mochi.mochibackend.community.repository.ReactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReactionServiceTest {

    private static final String SLUG = "iut";
    private static final String USER = "user-uid";

    @Mock
    private ReactionRepository reactionRepository;

    @Mock
    private CommunityService communityService;

    @Mock
    private PostService postService;

    @Mock
    private CommentService commentService;

    @Mock
    private BlogPostService blogPostService;

    private ReactionService service;

    @BeforeEach
    void setUp() {
        service = new ReactionService(reactionRepository, communityService, postService, commentService, blogPostService);

        lenient().when(communityService.getBySlug(SLUG)).thenReturn(community());
        lenient().when(communityService.requireApprovedMembership(any(Community.class), eq(USER)))
                .thenReturn(membershipOf(USER, MembershipRole.MEMBER));
        lenient().when(postService.getPostInCommunity(any(Community.class), eq(1L))).thenReturn(post());
        lenient().when(commentService.getCommentInPost(1L, 5L)).thenReturn(comment());
    }

    @Test
    void togglingAPostWithNoExistingReactionCreatesOneAndIncrements() {
        when(reactionRepository.findByPostIdAndUserUid(1L, USER)).thenReturn(Optional.empty());

        service.toggleUpvoteOnPost(USER, SLUG, 1L);

        verify(reactionRepository).save(any(Reaction.class));
        verify(reactionRepository, never()).delete(any(Reaction.class));
        verify(postService).adjustUpvoteCount(any(Post.class), eq(1));
    }

    @Test
    void togglingAPostWithAnExistingReactionRemovesItAndDecrements() {
        Reaction existing = new Reaction();
        existing.setId(9L);
        existing.setPostId(1L);
        existing.setUserUid(USER);
        when(reactionRepository.findByPostIdAndUserUid(1L, USER)).thenReturn(Optional.of(existing));

        service.toggleUpvoteOnPost(USER, SLUG, 1L);

        verify(reactionRepository).delete(existing);
        verify(reactionRepository, never()).save(any(Reaction.class));
        verify(postService).adjustUpvoteCount(any(Post.class), eq(-1));
    }

    @Test
    void togglingACommentWithNoExistingReactionCreatesOneAndIncrements() {
        when(reactionRepository.findByCommentIdAndUserUid(5L, USER)).thenReturn(Optional.empty());

        service.toggleUpvoteOnComment(USER, SLUG, 1L, 5L);

        verify(reactionRepository).save(any(Reaction.class));
        verify(commentService).adjustUpvoteCount(any(Comment.class), eq(1));
    }

    @Test
    void batchedCallerUpvotedPostIdsReturnsEmptySetForEmptyInput() {
        Set<Long> result = service.callerUpvotedPostIds(USER, List.of());
        assertThat(result).isEmpty();
    }

    // ---------- helpers ----------

    private Community community() {
        Community community = new Community();
        community.setId(1L);
        community.setSlug(SLUG);
        community.setName("iUT");
        community.setVisibility(CommunityVisibility.PUBLIC);
        return community;
    }

    private CommunityMembership membershipOf(String uid, MembershipRole role) {
        CommunityMembership membership = new CommunityMembership();
        membership.setCommunityId(1L);
        membership.setUserUid(uid);
        membership.setRole(role);
        membership.setStatus(MembershipStatus.APPROVED);
        return membership;
    }

    private Post post() {
        Post post = new Post();
        post.setId(1L);
        post.setCommunityId(1L);
        return post;
    }

    private Comment comment() {
        Comment comment = new Comment();
        comment.setId(5L);
        comment.setPostId(1L);
        return comment;
    }
}
