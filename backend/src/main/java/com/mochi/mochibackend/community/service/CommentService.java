package com.mochi.mochibackend.community.service;

import com.mochi.mochibackend.community.dto.CreateCommentRequest;
import com.mochi.mochibackend.community.entity.BlogPost;
import com.mochi.mochibackend.community.entity.Comment;
import com.mochi.mochibackend.community.entity.Community;
import com.mochi.mochibackend.community.entity.CommunityMembership;
import com.mochi.mochibackend.community.entity.Post;
import com.mochi.mochibackend.community.enums.MembershipRole;
import com.mochi.mochibackend.community.repository.CommentRepository;
import com.mochi.mochibackend.exception.CommentNotFoundException;
import com.mochi.mochibackend.exception.InvalidCommentRequestException;
import com.mochi.mochibackend.exception.NotCommentAuthorException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.function.Predicate;

/**
 * Community Rooms, Phase 3 (comments half) + Phase 4 (comments on blog
 * posts). Every method resolves the caller's community standing
 * through {@code CommunityService} first, then the target — a post via
 * {@code PostService.getPostInCommunity} or a blog post via
 * {@code BlogPostService.getPublishedBlogPostInCommunity} — same
 * layering those services themselves follow relative to
 * {@code CommunityService}. Comment counts are kept in sync here via
 * {@code PostService.adjustCommentCount}/{@code BlogPostService.adjustCommentCount},
 * in the same transaction as the comment write.
 */
@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final CommunityService communityService;
    private final PostService postService;
    private final BlogPostService blogPostService;

    public CommentService(
            CommentRepository commentRepository,
            CommunityService communityService,
            PostService postService,
            BlogPostService blogPostService) {
        this.commentRepository = commentRepository;
        this.communityService = communityService;
        this.postService = postService;
        this.blogPostService = blogPostService;
    }

    @Transactional
    public Comment create(String userUid, String slug, Long postId, CreateCommentRequest request) {
        Community community = communityService.getBySlug(slug);
        communityService.requireApprovedMembership(community, userUid);
        Post post = postService.getPostInCommunity(community, postId);

        Comment comment = new Comment();
        comment.setPostId(post.getId());
        comment.setAuthorUid(userUid);
        comment.setBody(request.getBody());
        comment.setParentCommentId(resolveParent(request.getParentCommentId(), c -> post.getId().equals(c.getPostId())));
        Comment saved = commentRepository.save(comment);

        postService.adjustCommentCount(post, 1);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Comment> list(String userUid, String slug, Long postId) {
        Community community = communityService.getBySlug(slug);
        communityService.requireApprovedMembership(community, userUid);
        Post post = postService.getPostInCommunity(community, postId);
        return commentRepository.findAllByPostIdOrderByCreatedAtAsc(post.getId());
    }

    @Transactional
    public void delete(String userUid, String slug, Long postId, Long commentId) {
        Community community = communityService.getBySlug(slug);
        CommunityMembership caller = communityService.requireApprovedMembership(community, userUid);
        Post post = postService.getPostInCommunity(community, postId);
        Comment comment = getCommentInPost(post.getId(), commentId);

        boolean isAuthor = comment.getAuthorUid().equals(userUid);
        boolean isModOrAdmin = caller.getRole() == MembershipRole.MODERATOR || caller.getRole() == MembershipRole.ADMIN;
        if (!isAuthor && !isModOrAdmin) {
            throw new NotCommentAuthorException("Only the author or a moderator can remove this comment");
        }

        // The DB's ON DELETE CASCADE (V24) removes any replies to this
        // comment along with it — comment_count needs to drop by all of
        // them, not just this one row, or it drifts high. See
        // CommentRepository.countByParentCommentId's javadoc.
        long repliesRemoved = commentRepository.countByParentCommentId(comment.getId());
        commentRepository.delete(comment);
        postService.adjustCommentCount(post, -(int) (1 + repliesRemoved));
    }

    /**
     * Public on purpose: {@code ReactionService} (comment upvotes) reuses
     * this rather than re-deriving "does this comment belong to this
     * post" — same reasoning as {@code PostService.getPostInCommunity}.
     */
    @Transactional(readOnly = true)
    public Comment getCommentInPost(Long postId, Long commentId) {
        return commentRepository.findByIdAndPostId(commentId, postId)
                .orElseThrow(() -> new CommentNotFoundException("Comment not found"));
    }

    /** Applies {@code delta} to a comment's denormalized upvote counter. Never goes negative. */
    @Transactional
    public void adjustUpvoteCount(Comment comment, int delta) {
        comment.setUpvoteCount(Math.max(0, comment.getUpvoteCount() + delta));
        commentRepository.save(comment);
    }

    // ------------------------------------------------------------------
    // Phase 4: comments on blog posts. Same shape as the post-comment
    // methods above, just targeting a BlogPost via BlogPostService
    // instead of a Post via PostService, and adjusting
    // BlogPost.commentCount instead of Post.commentCount.
    // ------------------------------------------------------------------

    @Transactional
    public Comment createOnBlogPost(String userUid, String slug, Long blogPostId, CreateCommentRequest request) {
        Community community = communityService.getBySlug(slug);
        communityService.requireApprovedMembership(community, userUid);
        BlogPost blogPost = blogPostService.getPublishedBlogPostInCommunity(community, blogPostId);

        Comment comment = new Comment();
        comment.setBlogPostId(blogPost.getId());
        comment.setAuthorUid(userUid);
        comment.setBody(request.getBody());
        comment.setParentCommentId(resolveParent(request.getParentCommentId(), c -> blogPost.getId().equals(c.getBlogPostId())));
        Comment saved = commentRepository.save(comment);

        blogPostService.adjustCommentCount(blogPost, 1);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Comment> listOnBlogPost(String userUid, String slug, Long blogPostId) {
        Community community = communityService.getBySlug(slug);
        communityService.requireApprovedMembership(community, userUid);
        BlogPost blogPost = blogPostService.getPublishedBlogPostInCommunity(community, blogPostId);
        return commentRepository.findAllByBlogPostIdOrderByCreatedAtAsc(blogPost.getId());
    }

    @Transactional
    public void deleteOnBlogPost(String userUid, String slug, Long blogPostId, Long commentId) {
        Community community = communityService.getBySlug(slug);
        CommunityMembership caller = communityService.requireApprovedMembership(community, userUid);
        BlogPost blogPost = blogPostService.getPublishedBlogPostInCommunity(community, blogPostId);
        Comment comment = getCommentOnBlogPost(blogPost.getId(), commentId);

        boolean isAuthor = comment.getAuthorUid().equals(userUid);
        boolean isModOrAdmin = caller.getRole() == MembershipRole.MODERATOR || caller.getRole() == MembershipRole.ADMIN;
        if (!isAuthor && !isModOrAdmin) {
            throw new NotCommentAuthorException("Only the author or a moderator can remove this comment");
        }

        // Same reply-cascade accounting as delete() above.
        long repliesRemoved = commentRepository.countByParentCommentId(comment.getId());
        commentRepository.delete(comment);
        blogPostService.adjustCommentCount(blogPost, -(int) (1 + repliesRemoved));
    }

    /** Public on purpose: {@code ReactionService} (blog comment upvotes) reuses this — same reasoning as {@code getCommentInPost}. */
    @Transactional(readOnly = true)
    public Comment getCommentOnBlogPost(Long blogPostId, Long commentId) {
        return commentRepository.findByIdAndBlogPostId(commentId, blogPostId)
                .orElseThrow(() -> new CommentNotFoundException("Comment not found"));
    }

    /** Public on purpose: {@code ReportService} (Phase 5) reuses this to resolve a reported comment's target post/blog-post without needing to know which one in advance — see {@code Comment.postId}/{@code blogPostId}'s javadoc. */
    @Transactional(readOnly = true)
    public Comment getById(Long commentId) {
        return commentRepository.findById(commentId)
                .orElseThrow(() -> new CommentNotFoundException("Comment not found"));
    }

    // ------------------------------------------------------------------
    // v2 backlog: threaded comments (one level of reply nesting). See
    // the V24 migration's header comment for why depth is capped at 1.
    // ------------------------------------------------------------------

    /**
     * Validates {@code requestedParentId} (null means "top-level
     * comment, no validation needed") and returns it unchanged if
     * valid. {@code belongsToSameTarget} is the caller's "is this
     * comment on the same post/blog post I'm replying within" check —
     * passed in rather than duplicated here, since a post-comment reply
     * and a blog-comment reply check different fields
     * ({@code postId} vs {@code blogPostId}) on the parent.
     */
    private Long resolveParent(Long requestedParentId, Predicate<Comment> belongsToSameTarget) {
        if (requestedParentId == null) {
            return null;
        }
        Comment parent = getById(requestedParentId);
        if (!belongsToSameTarget.test(parent)) {
            throw new InvalidCommentRequestException("That comment isn't on this post");
        }
        if (parent.getParentCommentId() != null) {
            throw new InvalidCommentRequestException("Replies can only be one level deep");
        }
        return parent.getId();
    }
}
