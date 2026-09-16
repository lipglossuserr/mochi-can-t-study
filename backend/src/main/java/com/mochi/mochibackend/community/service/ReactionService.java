package com.mochi.mochibackend.community.service;

import com.mochi.mochibackend.community.entity.BlogPost;
import com.mochi.mochibackend.community.entity.Comment;
import com.mochi.mochibackend.community.entity.Community;
import com.mochi.mochibackend.community.entity.Post;
import com.mochi.mochibackend.community.entity.Reaction;
import com.mochi.mochibackend.community.repository.ReactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Community Rooms, Phase 3 (reactions half). Upvotes only, toggled —
 * there's no separate "remove upvote" endpoint, calling
 * {@code toggleUpvoteOnPost}/{@code toggleUpvoteOnComment} again just
 * undoes it. One vote per user per target, enforced by the DB unique
 * keys on {@code post_reactions} (see {@code V19} migration) as well
 * as the existence check here — toggling is idempotent-safe even under
 * a race, since the DB constraint is the actual backstop.
 */
@Service
public class ReactionService {

    private final ReactionRepository reactionRepository;
    private final CommunityService communityService;
    private final PostService postService;
    private final CommentService commentService;
    private final BlogPostService blogPostService;

    public ReactionService(
            ReactionRepository reactionRepository,
            CommunityService communityService,
            PostService postService,
            CommentService commentService,
            BlogPostService blogPostService) {
        this.reactionRepository = reactionRepository;
        this.communityService = communityService;
        this.postService = postService;
        this.commentService = commentService;
        this.blogPostService = blogPostService;
    }

    /** @return the post's post-toggle state, so the controller can respond with the up-to-date counter. */
    @Transactional
    public Post toggleUpvoteOnPost(String userUid, String slug, Long postId) {
        Community community = communityService.getBySlug(slug);
        communityService.requireApprovedMembership(community, userUid);
        Post post = postService.getPostInCommunity(community, postId);

        Optional<Reaction> existing = reactionRepository.findByPostIdAndUserUid(post.getId(), userUid);
        if (existing.isPresent()) {
            reactionRepository.delete(existing.get());
            postService.adjustUpvoteCount(post, -1);
        } else {
            Reaction reaction = new Reaction();
            reaction.setPostId(post.getId());
            reaction.setUserUid(userUid);
            reactionRepository.save(reaction);
            postService.adjustUpvoteCount(post, 1);
        }
        return post;
    }

    /** @return the comment's post-toggle state. */
    @Transactional
    public Comment toggleUpvoteOnComment(String userUid, String slug, Long postId, Long commentId) {
        Community community = communityService.getBySlug(slug);
        communityService.requireApprovedMembership(community, userUid);
        Post post = postService.getPostInCommunity(community, postId);
        Comment comment = commentService.getCommentInPost(post.getId(), commentId);

        Optional<Reaction> existing = reactionRepository.findByCommentIdAndUserUid(comment.getId(), userUid);
        if (existing.isPresent()) {
            reactionRepository.delete(existing.get());
            commentService.adjustUpvoteCount(comment, -1);
        } else {
            Reaction reaction = new Reaction();
            reaction.setCommentId(comment.getId());
            reaction.setUserUid(userUid);
            reactionRepository.save(reaction);
            commentService.adjustUpvoteCount(comment, 1);
        }
        return comment;
    }

    /** Same, for a comment on a blog post — Phase 4. */
    @Transactional
    public Comment toggleUpvoteOnBlogComment(String userUid, String slug, Long blogPostId, Long commentId) {
        Community community = communityService.getBySlug(slug);
        communityService.requireApprovedMembership(community, userUid);
        BlogPost blogPost = blogPostService.getPublishedBlogPostInCommunity(community, blogPostId);
        Comment comment = commentService.getCommentOnBlogPost(blogPost.getId(), commentId);

        Optional<Reaction> existing = reactionRepository.findByCommentIdAndUserUid(comment.getId(), userUid);
        if (existing.isPresent()) {
            reactionRepository.delete(existing.get());
            commentService.adjustUpvoteCount(comment, -1);
        } else {
            Reaction reaction = new Reaction();
            reaction.setCommentId(comment.getId());
            reaction.setUserUid(userUid);
            reactionRepository.save(reaction);
            commentService.adjustUpvoteCount(comment, 1);
        }
        return comment;
    }

    @Transactional(readOnly = true)
    public boolean callerHasUpvotedPost(String userUid, Long postId) {
        return reactionRepository.findByPostIdAndUserUid(postId, userUid).isPresent();
    }

    @Transactional(readOnly = true)
    public boolean callerHasUpvotedComment(String userUid, Long commentId) {
        return reactionRepository.findByCommentIdAndUserUid(commentId, userUid).isPresent();
    }

    /** Batched "which of these posts has the caller upvoted" — one query for a whole feed page. */
    @Transactional(readOnly = true)
    public Set<Long> callerUpvotedPostIds(String userUid, List<Long> postIds) {
        if (postIds.isEmpty()) {
            return Set.of();
        }
        return reactionRepository.findAllByPostIdInAndUserUid(postIds, userUid).stream()
                .map(Reaction::getPostId)
                .collect(Collectors.toCollection(HashSet::new));
    }

    /** Same, for a post's comment list. */
    @Transactional(readOnly = true)
    public Set<Long> callerUpvotedCommentIds(String userUid, List<Long> commentIds) {
        if (commentIds.isEmpty()) {
            return Set.of();
        }
        return reactionRepository.findAllByCommentIdInAndUserUid(commentIds, userUid).stream()
                .map(Reaction::getCommentId)
                .collect(Collectors.toCollection(HashSet::new));
    }

    // ------------------------------------------------------------------
    // Phase 4: upvotes on blog posts. Same toggle shape as
    // toggleUpvoteOnPost above, targeting BlogPostService instead of
    // PostService and BlogPost.upvoteCount instead of Post.upvoteCount.
    // ------------------------------------------------------------------

    @Transactional
    public BlogPost toggleUpvoteOnBlogPost(String userUid, String slug, Long blogPostId) {
        Community community = communityService.getBySlug(slug);
        communityService.requireApprovedMembership(community, userUid);
        BlogPost blogPost = blogPostService.getPublishedBlogPostInCommunity(community, blogPostId);

        Optional<Reaction> existing = reactionRepository.findByBlogPostIdAndUserUid(blogPost.getId(), userUid);
        if (existing.isPresent()) {
            reactionRepository.delete(existing.get());
            blogPostService.adjustUpvoteCount(blogPost, -1);
        } else {
            Reaction reaction = new Reaction();
            reaction.setBlogPostId(blogPost.getId());
            reaction.setUserUid(userUid);
            reactionRepository.save(reaction);
            blogPostService.adjustUpvoteCount(blogPost, 1);
        }
        return blogPost;
    }

    @Transactional(readOnly = true)
    public boolean callerHasUpvotedBlogPost(String userUid, Long blogPostId) {
        return reactionRepository.findByBlogPostIdAndUserUid(blogPostId, userUid).isPresent();
    }

    /** Batched "which of these blog posts has the caller upvoted" — one query for a whole feed page. */
    @Transactional(readOnly = true)
    public Set<Long> callerUpvotedBlogPostIds(String userUid, List<Long> blogPostIds) {
        if (blogPostIds.isEmpty()) {
            return Set.of();
        }
        return reactionRepository.findAllByBlogPostIdInAndUserUid(blogPostIds, userUid).stream()
                .map(Reaction::getBlogPostId)
                .collect(Collectors.toCollection(HashSet::new));
    }
}
