package com.mochi.mochibackend.community.service;

import com.mochi.mochibackend.community.dto.CreateCommentRequest;
import com.mochi.mochibackend.community.entity.Comment;
import com.mochi.mochibackend.community.entity.Community;
import com.mochi.mochibackend.community.entity.CommunityMembership;
import com.mochi.mochibackend.community.entity.Post;
import com.mochi.mochibackend.community.enums.CommunityVisibility;
import com.mochi.mochibackend.community.enums.MembershipRole;
import com.mochi.mochibackend.community.enums.MembershipStatus;
import com.mochi.mochibackend.community.repository.CommentRepository;
import com.mochi.mochibackend.exception.CommentNotFoundException;
import com.mochi.mochibackend.exception.InvalidCommentRequestException;
import com.mochi.mochibackend.exception.NotCommentAuthorException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    private static final String SLUG = "iut";
    private static final String AUTHOR = "author-uid";
    private static final String OTHER_MEMBER = "other-uid";

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private CommunityService communityService;

    @Mock
    private PostService postService;

    @Mock
    private BlogPostService blogPostService;

    private CommentService service;

    @BeforeEach
    void setUp() {
        service = new CommentService(commentRepository, communityService, postService, blogPostService);

        lenient().when(communityService.getBySlug(SLUG)).thenReturn(community());
        lenient().when(postService.getPostInCommunity(any(Community.class), eq(1L))).thenReturn(post());
        lenient().when(commentRepository.save(any(Comment.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void createSavesACommentAndIncrementsThePostsCommentCount() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(AUTHOR)))
                .thenReturn(membershipOf(AUTHOR, MembershipRole.MEMBER));
        CreateCommentRequest request = new CreateCommentRequest();
        request.setBody("This helped a ton, thank you!");

        Comment comment = service.create(AUTHOR, SLUG, 1L, request);

        assertThat(comment.getAuthorUid()).isEqualTo(AUTHOR);
        assertThat(comment.getPostId()).isEqualTo(1L);
        verify(postService).adjustCommentCount(any(Post.class), eq(1));
    }

    @Test
    void deleteRejectsANonAuthorNonModerator() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(OTHER_MEMBER)))
                .thenReturn(membershipOf(OTHER_MEMBER, MembershipRole.MEMBER));
        when(commentRepository.findByIdAndPostId(5L, 1L)).thenReturn(Optional.of(existingComment()));

        assertThatThrownBy(() -> service.delete(OTHER_MEMBER, SLUG, 1L, 5L))
                .isInstanceOf(NotCommentAuthorException.class);

        verify(commentRepository, never()).delete(any(Comment.class));
    }

    @Test
    void deleteAllowsAModeratorEvenWhenNotTheAuthor() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(OTHER_MEMBER)))
                .thenReturn(membershipOf(OTHER_MEMBER, MembershipRole.MODERATOR));
        when(commentRepository.findByIdAndPostId(5L, 1L)).thenReturn(Optional.of(existingComment()));

        service.delete(OTHER_MEMBER, SLUG, 1L, 5L);

        verify(commentRepository, times(1)).delete(any(Comment.class));
        verify(postService).adjustCommentCount(any(Post.class), eq(-1));
    }

    @Test
    void getCommentInPostThrowsWhenMissing() {
        when(commentRepository.findByIdAndPostId(999L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getCommentInPost(1L, 999L))
                .isInstanceOf(CommentNotFoundException.class);
    }

    @Test
    void listReturnsCommentsInCreatedOrder() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(AUTHOR)))
                .thenReturn(membershipOf(AUTHOR, MembershipRole.MEMBER));
        when(commentRepository.findAllByPostIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(existingComment()));

        List<Comment> comments = service.list(AUTHOR, SLUG, 1L);

        assertThat(comments).hasSize(1);
    }

    // ---------- threaded comments (v2 backlog) ----------

    @Test
    void createSetsParentCommentIdWhenReplyingToATopLevelComment() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(AUTHOR)))
                .thenReturn(membershipOf(AUTHOR, MembershipRole.MEMBER));
        when(commentRepository.findById(5L)).thenReturn(Optional.of(existingComment()));
        CreateCommentRequest request = new CreateCommentRequest();
        request.setBody("Totally agree!");
        request.setParentCommentId(5L);

        Comment reply = service.create(AUTHOR, SLUG, 1L, request);

        assertThat(reply.getParentCommentId()).isEqualTo(5L);
    }

    @Test
    void createRejectsReplyingToAReply() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(AUTHOR)))
                .thenReturn(membershipOf(AUTHOR, MembershipRole.MEMBER));
        Comment existingReply = existingComment();
        existingReply.setParentCommentId(2L);
        when(commentRepository.findById(5L)).thenReturn(Optional.of(existingReply));
        CreateCommentRequest request = new CreateCommentRequest();
        request.setBody("Nested too deep");
        request.setParentCommentId(5L);

        assertThatThrownBy(() -> service.create(AUTHOR, SLUG, 1L, request))
                .isInstanceOf(InvalidCommentRequestException.class);
    }

    @Test
    void createRejectsReplyingToACommentOnADifferentPost() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(AUTHOR)))
                .thenReturn(membershipOf(AUTHOR, MembershipRole.MEMBER));
        Comment commentOnOtherPost = existingComment();
        commentOnOtherPost.setPostId(999L);
        when(commentRepository.findById(5L)).thenReturn(Optional.of(commentOnOtherPost));
        CreateCommentRequest request = new CreateCommentRequest();
        request.setBody("Wrong thread");
        request.setParentCommentId(5L);

        assertThatThrownBy(() -> service.create(AUTHOR, SLUG, 1L, request))
                .isInstanceOf(InvalidCommentRequestException.class);
    }

    @Test
    void deleteDecrementsCommentCountByOnePlusCascadedReplies() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(AUTHOR)))
                .thenReturn(membershipOf(AUTHOR, MembershipRole.MEMBER));
        when(commentRepository.findByIdAndPostId(5L, 1L)).thenReturn(Optional.of(existingComment()));
        when(commentRepository.countByParentCommentId(5L)).thenReturn(3L);

        service.delete(AUTHOR, SLUG, 1L, 5L);

        verify(postService).adjustCommentCount(any(Post.class), eq(-4));
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

    private Post post() {
        Post post = new Post();
        post.setId(1L);
        post.setCommunityId(1L);
        return post;
    }

    private CommunityMembership membershipOf(String uid, MembershipRole role) {
        CommunityMembership membership = new CommunityMembership();
        membership.setCommunityId(1L);
        membership.setUserUid(uid);
        membership.setRole(role);
        membership.setStatus(MembershipStatus.APPROVED);
        return membership;
    }

    private Comment existingComment() {
        Comment comment = new Comment();
        comment.setId(5L);
        comment.setPostId(1L);
        comment.setAuthorUid(AUTHOR);
        comment.setBody("Original comment");
        return comment;
    }
}
