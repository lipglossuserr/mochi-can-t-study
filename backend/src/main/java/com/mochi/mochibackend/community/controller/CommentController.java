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
 * The {@code /api/communities/{slug}/posts/{postId}/comments} contract
 * — Community Rooms, Phase 3. Same translate-only-HTTP shape as
 * {@code PostController}; every rule lives in {@code CommentService}/
 * {@code ReactionService}. Nested under posts rather than a top-level
 * {@code /comments} resource since a comment never makes sense without
 * its post and community context.
 */
@RestController
@RequestMapping("/api/communities/{slug}/posts/{postId}/comments")
public class CommentController {

    private final CommentService commentService;
    private final ReactionService reactionService;
    private final CommentMapper mapper;

    public CommentController(CommentService commentService, ReactionService reactionService, CommentMapper mapper) {
        this.commentService = commentService;
        this.reactionService = reactionService;
        this.mapper = mapper;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CommentResponse>> create(
            @PathVariable String slug, @PathVariable Long postId, @Valid @RequestBody CreateCommentRequest request) {
        String uid = currentUid();
        Comment comment = commentService.create(uid, slug, postId, request);
        return ResponseEntity.ok(ApiResponse.success("Comment added", mapper.toResponse(comment, false)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CommentResponse>>> list(
            @PathVariable String slug, @PathVariable Long postId) {
        String uid = currentUid();
        List<Comment> comments = commentService.list(uid, slug, postId);

        List<Long> commentIds = comments.stream().map(Comment::getId).toList();
        Set<Long> upvotedCommentIds = reactionService.callerUpvotedCommentIds(uid, commentIds);

        List<CommentResponse> responses = comments.stream()
                .map(comment -> mapper.toResponse(comment, upvotedCommentIds.contains(comment.getId())))
                .toList();

        return ResponseEntity.ok(ApiResponse.success("Comments retrieved", responses));
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable String slug, @PathVariable Long postId, @PathVariable Long commentId) {
        commentService.delete(currentUid(), slug, postId, commentId);
        return ResponseEntity.ok(ApiResponse.success("Comment removed", null));
    }

    /** Toggle — calling this again on an already-upvoted comment removes the upvote. */
    @PostMapping("/{commentId}/upvote")
    public ResponseEntity<ApiResponse<CommentResponse>> toggleUpvote(
            @PathVariable String slug, @PathVariable Long postId, @PathVariable Long commentId) {
        String uid = currentUid();
        Comment comment = reactionService.toggleUpvoteOnComment(uid, slug, postId, commentId);
        boolean nowUpvoted = reactionService.callerHasUpvotedComment(uid, comment.getId());
        return ResponseEntity.ok(ApiResponse.success(
                nowUpvoted ? "Upvoted" : "Upvote removed", mapper.toResponse(comment, nowUpvoted)));
    }

    /** Same pattern as PostController/CommunityController/TaskController: the uid comes from the verified Firebase token. */
    private String currentUid() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication instanceof FirebaseAuthenticationToken firebaseAuthenticationToken)) {
            throw new InvalidFirebaseTokenException("Invalid or missing Firebase token");
        }

        return firebaseAuthenticationToken.getUid();
    }
}
