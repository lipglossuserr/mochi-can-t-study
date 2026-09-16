package com.mochi.mochibackend.community.controller;

import com.mochi.mochibackend.community.dto.CreatePostRequest;
import com.mochi.mochibackend.community.dto.PostResponse;
import com.mochi.mochibackend.community.dto.UpdatePostRequest;
import com.mochi.mochibackend.community.dto.VotePollRequest;
import com.mochi.mochibackend.community.entity.Community;
import com.mochi.mochibackend.community.entity.PollOption;
import com.mochi.mochibackend.community.entity.PollVote;
import com.mochi.mochibackend.community.entity.Post;
import com.mochi.mochibackend.community.enums.PostType;
import com.mochi.mochibackend.community.mapper.PostMapper;
import com.mochi.mochibackend.community.service.CommunityService;
import com.mochi.mochibackend.community.service.PostService;
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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * The {@code /api/communities/{slug}/posts} contract — Community Rooms,
 * Phase 2 (posts/polls) and Phase 3 (upvotes; comments live in
 * {@code CommentController}). Same shape throughout: this layer only
 * translates HTTP <-> service calls, every rule lives in the services,
 * and the uid always comes from the verified Firebase token.
 * {@code /api/communities/**} already requires authentication in
 * {@code SecurityConfig} — no separate entry needed for this sub-path.
 */
@RestController
@RequestMapping("/api/communities/{slug}/posts")
public class PostController {

    private final PostService postService;
    private final CommunityService communityService;
    private final ReactionService reactionService;
    private final PostMapper mapper;

    public PostController(
            PostService postService,
            CommunityService communityService,
            ReactionService reactionService,
            PostMapper mapper) {
        this.postService = postService;
        this.communityService = communityService;
        this.reactionService = reactionService;
        this.mapper = mapper;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PostResponse>> create(
            @PathVariable String slug, @Valid @RequestBody CreatePostRequest request) {
        String uid = currentUid();
        Post post = postService.create(uid, slug, request);
        return ResponseEntity.ok(ApiResponse.success("Post created", toResponse(uid, slug, post)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<PostResponse>>> list(
            @PathVariable String slug,
            @RequestParam(required = false) PostType type,
            @RequestParam(required = false, defaultValue = "new") String sort) {
        String uid = currentUid();
        Community community = communityService.getBySlug(slug);
        List<Post> posts = postService.list(uid, slug, Optional.ofNullable(type), sort);

        List<Long> postIds = posts.stream().map(Post::getId).toList();
        Map<Long, List<PollOption>> optionsByPost = postService.optionsForPosts(postIds);
        Map<Long, PollVote> votesByPost = postService.findCallerVotes(uid, postIds);
        Set<Long> upvotedPostIds = reactionService.callerUpvotedPostIds(uid, postIds);

        List<PostResponse> responses = posts.stream()
                .map(post -> mapper.toResponse(
                        post,
                        postService.canRevealAuthor(uid, community, post),
                        optionsByPost.getOrDefault(post.getId(), Collections.emptyList()),
                        Optional.ofNullable(votesByPost.get(post.getId())),
                        upvotedPostIds.contains(post.getId())))
                .toList();

        return ResponseEntity.ok(ApiResponse.success("Posts retrieved", responses));
    }

    @GetMapping("/{postId}")
    public ResponseEntity<ApiResponse<PostResponse>> get(@PathVariable String slug, @PathVariable Long postId) {
        String uid = currentUid();
        Post post = postService.get(uid, slug, postId);
        return ResponseEntity.ok(ApiResponse.success("Post retrieved", toResponse(uid, slug, post)));
    }

    @PatchMapping("/{postId}")
    public ResponseEntity<ApiResponse<PostResponse>> update(
            @PathVariable String slug, @PathVariable Long postId, @Valid @RequestBody UpdatePostRequest request) {
        String uid = currentUid();
        Post post = postService.update(uid, slug, postId, request);
        return ResponseEntity.ok(ApiResponse.success("Post updated", toResponse(uid, slug, post)));
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String slug, @PathVariable Long postId) {
        postService.delete(currentUid(), slug, postId);
        return ResponseEntity.ok(ApiResponse.success("Post removed", null));
    }

    @PostMapping("/{postId}/pin")
    public ResponseEntity<ApiResponse<PostResponse>> togglePin(@PathVariable String slug, @PathVariable Long postId) {
        String uid = currentUid();
        Post post = postService.togglePin(uid, slug, postId);
        return ResponseEntity.ok(ApiResponse.success(post.isPinned() ? "Post pinned" : "Post unpinned", toResponse(uid, slug, post)));
    }

    @PostMapping("/{postId}/resolve")
    public ResponseEntity<ApiResponse<PostResponse>> toggleResolved(@PathVariable String slug, @PathVariable Long postId) {
        String uid = currentUid();
        Post post = postService.toggleResolved(uid, slug, postId);
        return ResponseEntity.ok(ApiResponse.success(post.isResolved() ? "Marked resolved" : "Marked unresolved", toResponse(uid, slug, post)));
    }

    @PostMapping("/{postId}/vote")
    public ResponseEntity<ApiResponse<PostResponse>> vote(
            @PathVariable String slug, @PathVariable Long postId, @Valid @RequestBody VotePollRequest request) {
        String uid = currentUid();
        postService.vote(uid, slug, postId, request.getOptionId());
        Post post = postService.get(uid, slug, postId);
        return ResponseEntity.ok(ApiResponse.success("Vote recorded", toResponse(uid, slug, post)));
    }

    /** Toggle — calling this again on an already-upvoted post removes the upvote. */
    @PostMapping("/{postId}/upvote")
    public ResponseEntity<ApiResponse<PostResponse>> toggleUpvote(@PathVariable String slug, @PathVariable Long postId) {
        String uid = currentUid();
        Post post = reactionService.toggleUpvoteOnPost(uid, slug, postId);
        boolean nowUpvoted = reactionService.callerHasUpvotedPost(uid, post.getId());
        return ResponseEntity.ok(ApiResponse.success(
                nowUpvoted ? "Upvoted" : "Upvote removed", toResponse(uid, slug, post)));
    }

    // ------------------------------------------------------------------

    private PostResponse toResponse(String uid, String slug, Post post) {
        Community community = communityService.getBySlug(slug);
        List<PollOption> options = postService.optionsFor(post.getId());
        Optional<PollVote> callerVote = postService.findCallerVote(uid, post.getId());
        boolean callerUpvoted = reactionService.callerHasUpvotedPost(uid, post.getId());
        return mapper.toResponse(post, postService.canRevealAuthor(uid, community, post), options, callerVote, callerUpvoted);
    }

    /** Same pattern as CommunityController/TaskController: the uid comes from the verified Firebase token. */
    private String currentUid() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication instanceof FirebaseAuthenticationToken firebaseAuthenticationToken)) {
            throw new InvalidFirebaseTokenException("Invalid or missing Firebase token");
        }

        return firebaseAuthenticationToken.getUid();
    }
}
