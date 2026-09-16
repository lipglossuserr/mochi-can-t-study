package com.mochi.mochibackend.community.service;

import com.mochi.mochibackend.community.dto.CreateReportRequest;
import com.mochi.mochibackend.community.entity.BlogPost;
import com.mochi.mochibackend.community.entity.Comment;
import com.mochi.mochibackend.community.entity.Community;
import com.mochi.mochibackend.community.entity.CommunityMembership;
import com.mochi.mochibackend.community.entity.Post;
import com.mochi.mochibackend.community.entity.Report;
import com.mochi.mochibackend.community.enums.ReportStatus;
import com.mochi.mochibackend.community.repository.ReportRepository;
import com.mochi.mochibackend.exception.AlreadyReportedException;
import com.mochi.mochibackend.exception.ReportNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

/**
 * Community Rooms, Phase 5: the moderation report queue. The design
 * doc flags this as overdue tech debt — it should have shipped
 * alongside vents in Phase 2 — so this both adds reporting and closes
 * that gap for every content type that exists so far (posts, comments,
 * blog posts; chat doesn't exist yet).
 * <p>
 * {@code create} resolves and validates the target by delegating to
 * {@code PostService}/{@code CommentService}/{@code BlogPostService}
 * rather than touching their repositories directly — same "go through
 * the owning service" convention {@code CommentService}/
 * {@code ReactionService} already follow relative to {@code PostService}.
 * The three moderator actions ({@code dismiss}/{@code removeContent}/
 * {@code banAuthor}) mirror the design doc's
 * {@code ModerationQueueRow} spec exactly: Dismiss / Remove Content /
 * Ban.
 */
@Service
public class ReportService {

    private final ReportRepository reportRepository;
    private final CommunityService communityService;
    private final PostService postService;
    private final CommentService commentService;
    private final BlogPostService blogPostService;
    private final Clock clock;

    public ReportService(
            ReportRepository reportRepository,
            CommunityService communityService,
            PostService postService,
            CommentService commentService,
            BlogPostService blogPostService,
            Clock clock) {
        this.reportRepository = reportRepository;
        this.communityService = communityService;
        this.postService = postService;
        this.commentService = commentService;
        this.blogPostService = blogPostService;
        this.clock = clock;
    }

    /**
     * Any APPROVED member may report content — no moderator gate on
     * creating a report, only on reviewing the queue. Validates the
     * target exists in this community by delegating to the owning
     * service (throws that service's own not-found exception if it
     * doesn't), then checks for a duplicate report from this reporter
     * before inserting — proactively, rather than relying on the DB
     * unique constraint to reject it, so the error is a clean
     * {@link AlreadyReportedException} instead of a raw constraint
     * violation bubbling up.
     */
    @Transactional
    public Report create(String userUid, String slug, CreateReportRequest request) {
        Community community = communityService.getBySlug(slug);
        communityService.requireApprovedMembership(community, userUid);

        Report report = new Report();
        report.setCommunityId(community.getId());
        report.setReporterUid(userUid);
        report.setReason(request.getReason());
        report.setNote(request.getNote());

        switch (request.getTargetType()) {
            case POST -> {
                Post post = postService.getPostInCommunity(community, request.getTargetId());
                requireNotAlreadyReportedPost(post.getId(), userUid);
                report.setPostId(post.getId());
            }
            case BLOG_POST -> {
                BlogPost blogPost = blogPostService.getPublishedBlogPostInCommunity(community, request.getTargetId());
                requireNotAlreadyReportedBlogPost(blogPost.getId(), userUid);
                report.setBlogPostId(blogPost.getId());
            }
            case COMMENT -> {
                Comment comment = commentService.getById(request.getTargetId());
                requireCommentBelongsToCommunity(community, comment);
                requireNotAlreadyReportedComment(comment.getId(), userUid);
                report.setCommentId(comment.getId());
            }
        }

        return reportRepository.save(report);
    }

    /** Moderator/admin only — the queue itself. Defaults callers to PENDING via the controller; any status can be requested (e.g. reviewing history). */
    @Transactional(readOnly = true)
    public List<Report> listQueue(String userUid, String slug, ReportStatus status) {
        Community community = communityService.getBySlug(slug);
        CommunityMembership caller = communityService.requireApprovedMembership(community, userUid);
        communityService.requireModeratorOrAdmin(caller);

        return reportRepository.findAllByCommunityIdAndStatusOrderByCreatedAtAsc(community.getId(), status);
    }

    /** "Dismiss" — reviewed, no action needed. Does not touch the reported content. */
    @Transactional
    public Report dismiss(String userUid, String slug, Long reportId) {
        Community community = communityService.getBySlug(slug);
        CommunityMembership caller = communityService.requireApprovedMembership(community, userUid);
        communityService.requireModeratorOrAdmin(caller);

        Report report = requireReport(community.getId(), reportId);
        markReviewed(report, userUid, ReportStatus.DISMISSED);
        return reportRepository.save(report);
    }

    /**
     * "Remove Content" — deletes the reported post/comment/blog post
     * (via that content's own service, which already allows a
     * moderator/admin to delete regardless of authorship — see
     * {@code PostService.delete}/{@code CommentService.delete}/
     * {@code BlogPostService.delete}), then resolves this report and
     * every other still-PENDING report pointing at the same content,
     * so acting on one report doesn't leave duplicates sitting in the
     * queue for content that's already gone.
     */
    @Transactional
    public Report removeContent(String userUid, String slug, Long reportId) {
        Community community = communityService.getBySlug(slug);
        CommunityMembership caller = communityService.requireApprovedMembership(community, userUid);
        communityService.requireModeratorOrAdmin(caller);

        Report report = requireReport(community.getId(), reportId);

        if (report.getPostId() != null) {
            postService.delete(userUid, slug, report.getPostId());
            resolveSiblings(reportRepository.findAllByPostIdAndStatus(report.getPostId(), ReportStatus.PENDING), userUid);
        } else if (report.getBlogPostId() != null) {
            blogPostService.delete(userUid, slug, report.getBlogPostId());
            resolveSiblings(reportRepository.findAllByBlogPostIdAndStatus(report.getBlogPostId(), ReportStatus.PENDING), userUid);
        } else {
            Comment comment = commentService.getById(report.getCommentId());
            if (comment.getPostId() != null) {
                commentService.delete(userUid, slug, comment.getPostId(), comment.getId());
            } else {
                commentService.deleteOnBlogPost(userUid, slug, comment.getBlogPostId(), comment.getId());
            }
            resolveSiblings(reportRepository.findAllByCommentIdAndStatus(report.getCommentId(), ReportStatus.PENDING), userUid);
        }

        markReviewed(report, userUid, ReportStatus.RESOLVED);
        return reportRepository.save(report);
    }

    /**
     * "Ban" — bans the reported content's author from the community
     * (via {@code CommunityService.ban}) and resolves this report plus
     * every other still-PENDING report pointing at the same content.
     * Does NOT delete the content itself — a moderator who wants both
     * calls {@code removeContent} first, then this. Refuses (via
     * {@code CommunityService.ban}) if the author is an ADMIN.
     */
    @Transactional
    public Report banAuthor(String userUid, String slug, Long reportId) {
        Community community = communityService.getBySlug(slug);
        CommunityMembership caller = communityService.requireApprovedMembership(community, userUid);
        communityService.requireModeratorOrAdmin(caller);

        Report report = requireReport(community.getId(), reportId);
        String authorUid = resolveAuthorUid(community, slug, report);
        communityService.ban(userUid, slug, authorUid);

        List<Report> siblings = report.getPostId() != null
                ? reportRepository.findAllByPostIdAndStatus(report.getPostId(), ReportStatus.PENDING)
                : report.getBlogPostId() != null
                ? reportRepository.findAllByBlogPostIdAndStatus(report.getBlogPostId(), ReportStatus.PENDING)
                : reportRepository.findAllByCommentIdAndStatus(report.getCommentId(), ReportStatus.PENDING);
        resolveSiblings(siblings, userUid);

        markReviewed(report, userUid, ReportStatus.RESOLVED);
        return reportRepository.save(report);
    }

    // ------------------------------------------------------------------

    private String resolveAuthorUid(Community community, String slug, Report report) {
        if (report.getPostId() != null) {
            return postService.getPostInCommunity(community, report.getPostId()).getAuthorUid();
        }
        if (report.getBlogPostId() != null) {
            return blogPostService.getPublishedBlogPostInCommunity(community, report.getBlogPostId()).getAuthorUid();
        }
        return commentService.getById(report.getCommentId()).getAuthorUid();
    }

    private void resolveSiblings(List<Report> siblings, String reviewerUid) {
        Instant now = Instant.now(clock);
        for (Report sibling : siblings) {
            sibling.setStatus(ReportStatus.RESOLVED);
            sibling.setReviewedByUid(reviewerUid);
            sibling.setReviewedAt(now);
        }
        reportRepository.saveAll(siblings);
    }

    private void markReviewed(Report report, String reviewerUid, ReportStatus status) {
        report.setStatus(status);
        report.setReviewedByUid(reviewerUid);
        report.setReviewedAt(Instant.now(clock));
    }

    private Report requireReport(Long communityId, Long reportId) {
        return reportRepository.findByIdAndCommunityId(reportId, communityId)
                .orElseThrow(() -> new ReportNotFoundException("Report not found"));
    }

    private void requireCommentBelongsToCommunity(Community community, Comment comment) {
        if (comment.getPostId() != null) {
            postService.getPostInCommunity(community, comment.getPostId());
        } else {
            blogPostService.getPublishedBlogPostInCommunity(community, comment.getBlogPostId());
        }
    }

    private void requireNotAlreadyReportedPost(Long postId, String reporterUid) {
        if (reportRepository.existsByPostIdAndReporterUid(postId, reporterUid)) {
            throw new AlreadyReportedException("You've already reported this");
        }
    }

    private void requireNotAlreadyReportedComment(Long commentId, String reporterUid) {
        if (reportRepository.existsByCommentIdAndReporterUid(commentId, reporterUid)) {
            throw new AlreadyReportedException("You've already reported this");
        }
    }

    private void requireNotAlreadyReportedBlogPost(Long blogPostId, String reporterUid) {
        if (reportRepository.existsByBlogPostIdAndReporterUid(blogPostId, reporterUid)) {
            throw new AlreadyReportedException("You've already reported this");
        }
    }
}
