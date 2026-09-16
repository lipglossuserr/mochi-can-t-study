package com.mochi.mochibackend.community.service;

import com.mochi.mochibackend.community.dto.CreateReportRequest;
import com.mochi.mochibackend.community.entity.BlogPost;
import com.mochi.mochibackend.community.entity.Comment;
import com.mochi.mochibackend.community.entity.Community;
import com.mochi.mochibackend.community.entity.CommunityMembership;
import com.mochi.mochibackend.community.entity.Post;
import com.mochi.mochibackend.community.entity.Report;
import com.mochi.mochibackend.community.enums.BlogStatus;
import com.mochi.mochibackend.community.enums.CommunityVisibility;
import com.mochi.mochibackend.community.enums.MembershipRole;
import com.mochi.mochibackend.community.enums.MembershipStatus;
import com.mochi.mochibackend.community.enums.PostType;
import com.mochi.mochibackend.community.enums.ReportReason;
import com.mochi.mochibackend.community.enums.ReportStatus;
import com.mochi.mochibackend.community.enums.ReportTargetType;
import com.mochi.mochibackend.community.repository.ReportRepository;
import com.mochi.mochibackend.exception.AlreadyReportedException;
import com.mochi.mochibackend.exception.InsufficientCommunityRoleException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
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
class ReportServiceTest {

    private static final String SLUG = "iut";
    private static final String REPORTER = "reporter-uid";
    private static final String MODERATOR = "mod-uid";

    @Mock
    private ReportRepository reportRepository;

    @Mock
    private CommunityService communityService;

    @Mock
    private PostService postService;

    @Mock
    private CommentService commentService;

    @Mock
    private BlogPostService blogPostService;

    private ReportService service;

    @BeforeEach
    void setUp() {
        Clock fixedClock = Clock.fixed(Instant.parse("2026-08-14T00:00:00Z"), ZoneOffset.UTC);
        service = new ReportService(reportRepository, communityService, postService, commentService, blogPostService, fixedClock);

        lenient().when(communityService.getBySlug(SLUG)).thenReturn(community());
        lenient().when(reportRepository.save(any(Report.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void createResolvesAPostTargetAndSaves() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(REPORTER)))
                .thenReturn(membershipOf(REPORTER, MembershipRole.MEMBER));
        when(postService.getPostInCommunity(any(Community.class), eq(5L))).thenReturn(postOf(5L));
        when(reportRepository.existsByPostIdAndReporterUid(5L, REPORTER)).thenReturn(false);

        CreateReportRequest request = new CreateReportRequest();
        request.setTargetType(ReportTargetType.POST);
        request.setTargetId(5L);
        request.setReason(ReportReason.SPAM);

        Report saved = service.create(REPORTER, SLUG, request);

        assertThat(saved.getPostId()).isEqualTo(5L);
        assertThat(saved.getCommentId()).isNull();
        assertThat(saved.getBlogPostId()).isNull();
        assertThat(saved.getReason()).isEqualTo(ReportReason.SPAM);
        assertThat(saved.getStatus()).isEqualTo(ReportStatus.PENDING);
    }

    @Test
    void createRejectsADuplicateReportFromTheSameReporter() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(REPORTER)))
                .thenReturn(membershipOf(REPORTER, MembershipRole.MEMBER));
        when(postService.getPostInCommunity(any(Community.class), eq(5L))).thenReturn(postOf(5L));
        when(reportRepository.existsByPostIdAndReporterUid(5L, REPORTER)).thenReturn(true);

        CreateReportRequest request = new CreateReportRequest();
        request.setTargetType(ReportTargetType.POST);
        request.setTargetId(5L);
        request.setReason(ReportReason.SPAM);

        assertThatThrownBy(() -> service.create(REPORTER, SLUG, request))
                .isInstanceOf(AlreadyReportedException.class);
    }

    @Test
    void createResolvesACommentTargetThroughItsParentPost() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(REPORTER)))
                .thenReturn(membershipOf(REPORTER, MembershipRole.MEMBER));
        Comment comment = new Comment();
        comment.setId(9L);
        comment.setPostId(5L);
        when(commentService.getById(9L)).thenReturn(comment);
        when(postService.getPostInCommunity(any(Community.class), eq(5L))).thenReturn(postOf(5L));
        when(reportRepository.existsByCommentIdAndReporterUid(9L, REPORTER)).thenReturn(false);

        CreateReportRequest request = new CreateReportRequest();
        request.setTargetType(ReportTargetType.COMMENT);
        request.setTargetId(9L);
        request.setReason(ReportReason.HARASSMENT);

        Report saved = service.create(REPORTER, SLUG, request);

        assertThat(saved.getCommentId()).isEqualTo(9L);
    }

    @Test
    void listQueueRejectsAPlainMember() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(REPORTER)))
                .thenReturn(membershipOf(REPORTER, MembershipRole.MEMBER));
        org.mockito.Mockito.doThrow(new InsufficientCommunityRoleException("nope"))
                .when(communityService).requireModeratorOrAdmin(any(CommunityMembership.class));

        assertThatThrownBy(() -> service.listQueue(REPORTER, SLUG, ReportStatus.PENDING))
                .isInstanceOf(InsufficientCommunityRoleException.class);
    }

    @Test
    void dismissMarksTheReportReviewedWithoutTouchingContent() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(MODERATOR)))
                .thenReturn(membershipOf(MODERATOR, MembershipRole.MODERATOR));
        Report report = reportOnPost(5L);
        when(reportRepository.findByIdAndCommunityId(1L, 1L)).thenReturn(Optional.of(report));

        Report result = service.dismiss(MODERATOR, SLUG, 1L);

        assertThat(result.getStatus()).isEqualTo(ReportStatus.DISMISSED);
        assertThat(result.getReviewedByUid()).isEqualTo(MODERATOR);
        verify(postService, never()).delete(any(), any(), any());
    }

    @Test
    void removeContentDeletesThePostAndResolvesSiblingReports() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(MODERATOR)))
                .thenReturn(membershipOf(MODERATOR, MembershipRole.MODERATOR));
        Report report = reportOnPost(5L);
        Report sibling = reportOnPost(5L);
        when(reportRepository.findByIdAndCommunityId(1L, 1L)).thenReturn(Optional.of(report));
        when(reportRepository.findAllByPostIdAndStatus(5L, ReportStatus.PENDING)).thenReturn(List.of(sibling));

        Report result = service.removeContent(MODERATOR, SLUG, 1L);

        verify(postService, times(1)).delete(MODERATOR, SLUG, 5L);
        assertThat(result.getStatus()).isEqualTo(ReportStatus.RESOLVED);
        assertThat(sibling.getStatus()).isEqualTo(ReportStatus.RESOLVED);
    }

    @Test
    void banAuthorBansThePostAuthorAndResolvesTheReport() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(MODERATOR)))
                .thenReturn(membershipOf(MODERATOR, MembershipRole.MODERATOR));
        Report report = reportOnPost(5L);
        when(reportRepository.findByIdAndCommunityId(1L, 1L)).thenReturn(Optional.of(report));
        when(postService.getPostInCommunity(any(Community.class), eq(5L))).thenReturn(postOf(5L));
        when(reportRepository.findAllByPostIdAndStatus(5L, ReportStatus.PENDING)).thenReturn(List.of());

        service.banAuthor(MODERATOR, SLUG, 1L);

        verify(communityService).ban(MODERATOR, SLUG, "post-author-uid");
    }

    @Test
    void removeContentOnABlogPostDelegatesToBlogPostService() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(MODERATOR)))
                .thenReturn(membershipOf(MODERATOR, MembershipRole.MODERATOR));
        Report report = new Report();
        report.setId(2L);
        report.setBlogPostId(7L);
        report.setStatus(ReportStatus.PENDING);
        when(reportRepository.findByIdAndCommunityId(2L, 1L)).thenReturn(Optional.of(report));
        when(reportRepository.findAllByBlogPostIdAndStatus(7L, ReportStatus.PENDING)).thenReturn(List.of());

        service.removeContent(MODERATOR, SLUG, 2L);

        verify(blogPostService).delete(MODERATOR, SLUG, 7L);
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

    private Post postOf(Long id) {
        Post post = new Post();
        post.setId(id);
        post.setCommunityId(1L);
        post.setAuthorUid("post-author-uid");
        post.setType(PostType.VENT);
        post.setBody("something");
        return post;
    }

    private BlogPost blogPostOf(Long id) {
        BlogPost blogPost = new BlogPost();
        blogPost.setId(id);
        blogPost.setCommunityId(1L);
        blogPost.setAuthorUid("blog-author-uid");
        blogPost.setStatus(BlogStatus.PUBLISHED);
        return blogPost;
    }

    private Report reportOnPost(Long postId) {
        Report report = new Report();
        report.setId(1L);
        report.setCommunityId(1L);
        report.setReporterUid(REPORTER);
        report.setPostId(postId);
        report.setReason(ReportReason.SPAM);
        report.setStatus(ReportStatus.PENDING);
        return report;
    }
}
