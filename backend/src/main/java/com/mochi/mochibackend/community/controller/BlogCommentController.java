package com.mochi.mochibackend.community.controller;

import com.mochi.mochibackend.community.dto.CommentResponse;
import com.mochi.mochibackend.community.dto.CreateCommentRequest;
import com.mochi.mochibackend.community.entity.Comment;
import com.mochi.mochibackend.community.mapper.CommentMapper;
import com.mochi.mochibackend.community.service.CommentService;
import com.mochi.mochibackend.community.service.ReactionService;
import com.mochi.mochibackend.dto.ApiResponse;
import com.mochi.mochibackend.exception.InvalidFirebaseTokenException;
import com.mochi.mochibackend.security.FirebaseAuthenticationToken;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Set;

/**
 * The {@code /api/communities/{slug}/blog/{blogId}/comments} contract
 * — Community Rooms, Phase 4. Same translate-only-HTTP shape as
 * {@code CommentController}, targeting {@code CommentService}'s
 * blog-post-scoped methods instead of its post-scoped ones. A separate
 * controller class rather than folding this into {@code CommentController}
 * — the path prefix differs ({@code /blog/{blogId}} vs
 * {@code /posts/{postId}}) and Spring MVC has no clean way to share one
 * {@code @RequestMapping} across two different parent resources.
 */
@RestController
@RequestMapping("/api/communities/{slug}/blog/{blogId}/comments")
public class BlogCommentController {

    private final CommentService commentService;
    private final ReactionService reactionService;
    private final CommentMapper mapper;

    public BlogCommentController(CommentService commentService, ReactionService reactionService, CommentMapper mapper) {
        this.commentService = commentService;
        this.reactionService = reactionService;
        this.mapper = mapper;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CommentResponse>> create(
            @PathVariable String slug, @PathVariable Long blogId, @Valid @RequestBody CreateCommentRequest request) {
        String uid = currentUid();
        Comment comment = commentService.createOnBlogPost(uid, slug, blogId, request);
        return ResponseEntity.ok(ApiResponse.success("Comment added", mapper.toResponse(comment, false)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CommentResponse>>> list(
            @PathVariable String slug, @PathVariable Long blogId) {
        String uid = currentUid();
        List<Comment> comments = commentService.listOnBlogPost(uid, slug, blogId);

        List<Long> commentIds = comments.stream().map(Comment::getId).toList();
        Set<Long> upvotedCommentIds = reactionService.callerUpvotedCommentIds(uid, commentIds);

        List<CommentResponse> responses = comments.stream()
                .map(comment -> mapper.toResponse(comment, upvotedCommentIds.contains(comment.getId())))
                .toList();

        return ResponseEntity.ok(ApiResponse.success("Comments retrieved", responses));
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable String slug, @PathVariable Long blogId, @PathVariable Long commentId) {
        commentService.deleteOnBlogPost(currentUid(), slug, blogId, commentId);
        return ResponseEntity.ok(ApiResponse.success("Comment removed", null));
    }

    /** Toggle — calling this again on an already-upvoted comment removes the upvote. */
    @PostMapping("/{commentId}/upvote")
    public ResponseEntity<ApiResponse<CommentResponse>> toggleUpvote(
            @PathVariable String slug, @PathVariable Long blogId, @PathVariable Long commentId) {
        String uid = currentUid();
        Comment comment = reactionService.toggleUpvoteOnBlogComment(uid, slug, blogId, commentId);
        boolean nowUpvoted = reactionService.callerHasUpvotedComment(uid, comment.getId());
        return ResponseEntity.ok(ApiResponse.success(
                nowUpvoted ? "Upvoted" : "Upvote removed", mapper.toResponse(comment, nowUpvoted)));
    }

    /** Same pattern as CommentController/PostController: the uid comes from the verified Firebase token. */
    private String currentUid() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication instanceof FirebaseAuthenticationToken firebaseAuthenticationToken)) {
            throw new InvalidFirebaseTokenException("Invalid or missing Firebase token");
        }

        return firebaseAuthenticationToken.getUid();
    }
}
