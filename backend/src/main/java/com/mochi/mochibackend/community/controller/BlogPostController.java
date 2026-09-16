package com.mochi.mochibackend.community.controller;

import com.mochi.mochibackend.community.dto.BlogPostResponse;
import com.mochi.mochibackend.community.dto.CreateBlogPostRequest;
import com.mochi.mochibackend.community.dto.UpdateBlogPostRequest;
import com.mochi.mochibackend.community.entity.BlogPost;
import com.mochi.mochibackend.community.mapper.BlogPostMapper;
import com.mochi.mochibackend.community.service.BlogPostService;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The {@code /api/communities/{slug}/blog} contract — Community Rooms,
 * Phase 4. Same translate-only-HTTP shape as {@code PostController};
 * every rule lives in {@code BlogPostService}/{@code ReactionService}.
 * Blog comments live in their own {@code BlogCommentController}, same
 * split {@code PostController}/{@code CommentController} already
 * establish.
 * <p>
 * {@code /blog/mine} is mapped ahead of {@code /blog/{blogId}} in this
 * file only for readability — Spring resolves the more specific static
 * path first regardless of declaration order, so there's no routing
 * ambiguity either way.
 */
@RestController
@RequestMapping("/api/communities/{slug}/blog")
public class BlogPostController {

    private final BlogPostService blogPostService;
    private final ReactionService reactionService;
    private final BlogPostMapper mapper;

    public BlogPostController(BlogPostService blogPostService, ReactionService reactionService, BlogPostMapper mapper) {
        this.blogPostService = blogPostService;
        this.reactionService = reactionService;
        this.mapper = mapper;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BlogPostResponse>> create(
            @PathVariable String slug, @Valid @RequestBody CreateBlogPostRequest request) {
        String uid = currentUid();
        BlogPost blogPost = blogPostService.create(uid, slug, request);
        return ResponseEntity.ok(ApiResponse.success("Draft created", toDetailResponse(uid, blogPost)));
    }

    /** The public feed — published posts only, newest-first. */
    @GetMapping
    public ResponseEntity<ApiResponse<List<BlogPostResponse>>> list(@PathVariable String slug) {
        String uid = currentUid();
        List<BlogPost> posts = blogPostService.listPublished(uid, slug);
        return ResponseEntity.ok(ApiResponse.success("Blog posts retrieved", toSummaryResponses(uid, posts)));
    }

    /** The caller's own posts — drafts and published alike. */
    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<List<BlogPostResponse>>> listMine(@PathVariable String slug) {
        String uid = currentUid();
        List<BlogPost> posts = blogPostService.listMine(uid, slug);
        return ResponseEntity.ok(ApiResponse.success("Your blog posts retrieved", toSummaryResponses(uid, posts)));
    }

    @GetMapping("/{blogId}")
    public ResponseEntity<ApiResponse<BlogPostResponse>> get(@PathVariable String slug, @PathVariable Long blogId) {
        String uid = currentUid();
        BlogPost blogPost = blogPostService.get(uid, slug, blogId);
        return ResponseEntity.ok(ApiResponse.success("Blog post retrieved", toDetailResponse(uid, blogPost)));
    }

    @PatchMapping("/{blogId}")
    public ResponseEntity<ApiResponse<BlogPostResponse>> update(
            @PathVariable String slug, @PathVariable Long blogId, @Valid @RequestBody UpdateBlogPostRequest request) {
        String uid = currentUid();
        BlogPost blogPost = blogPostService.update(uid, slug, blogId, request);
        return ResponseEntity.ok(ApiResponse.success("Draft saved", toDetailResponse(uid, blogPost)));
    }

    @DeleteMapping("/{blogId}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String slug, @PathVariable Long blogId) {
        blogPostService.delete(currentUid(), slug, blogId);
        return ResponseEntity.ok(ApiResponse.success("Blog post removed", null));
    }

    @PostMapping("/{blogId}/publish")
    public ResponseEntity<ApiResponse<BlogPostResponse>> publish(@PathVariable String slug, @PathVariable Long blogId) {
        String uid = currentUid();
        BlogPost blogPost = blogPostService.publish(uid, slug, blogId);
        return ResponseEntity.ok(ApiResponse.success("Published", toDetailResponse(uid, blogPost)));
    }

    @PostMapping("/{blogId}/unpublish")
    public ResponseEntity<ApiResponse<BlogPostResponse>> unpublish(@PathVariable String slug, @PathVariable Long blogId) {
        String uid = currentUid();
        BlogPost blogPost = blogPostService.unpublish(uid, slug, blogId);
        return ResponseEntity.ok(ApiResponse.success("Moved back to drafts", toDetailResponse(uid, blogPost)));
    }

    /** Toggle — calling this again on an already-upvoted post removes the upvote. */
    @PostMapping("/{blogId}/upvote")
    public ResponseEntity<ApiResponse<BlogPostResponse>> toggleUpvote(@PathVariable String slug, @PathVariable Long blogId) {
        String uid = currentUid();
        BlogPost blogPost = reactionService.toggleUpvoteOnBlogPost(uid, slug, blogId);
        boolean nowUpvoted = reactionService.callerHasUpvotedBlogPost(uid, blogPost.getId());
        return ResponseEntity.ok(ApiResponse.success(
                nowUpvoted ? "Upvoted" : "Upvote removed", toDetailResponse(uid, blogPost)));
    }

    // ------------------------------------------------------------------

    private BlogPostResponse toDetailResponse(String uid, BlogPost blogPost) {
        boolean callerUpvoted = reactionService.callerHasUpvotedBlogPost(uid, blogPost.getId());
        return mapper.toDetailResponse(blogPost, callerUpvoted, blogPost.getAuthorUid().equals(uid));
    }

    private List<BlogPostResponse> toSummaryResponses(String uid, List<BlogPost> posts) {
        List<Long> ids = posts.stream().map(BlogPost::getId).toList();
        var upvotedIds = reactionService.callerUpvotedBlogPostIds(uid, ids);
        return posts.stream()
                .map(p -> mapper.toSummaryResponse(p, upvotedIds.contains(p.getId()), p.getAuthorUid().equals(uid)))
                .toList();
    }

    /** Same pattern as PostController/CommentController: the uid comes from the verified Firebase token. */
    private String currentUid() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication instanceof FirebaseAuthenticationToken firebaseAuthenticationToken)) {
            throw new InvalidFirebaseTokenException("Invalid or missing Firebase token");
        }

        return firebaseAuthenticationToken.getUid();
    }
}
