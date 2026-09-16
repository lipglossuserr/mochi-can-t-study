package com.mochi.mochibackend.community.repository;

import com.mochi.mochibackend.community.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    Optional<Comment> findByIdAndPostId(Long id, Long postId);

    List<Comment> findAllByPostIdOrderByCreatedAtAsc(Long postId);

    /** Phase 4: same lookups, scoped to a blog post's comments instead of a short post's. */
    Optional<Comment> findByIdAndBlogPostId(Long id, Long blogPostId);

    List<Comment> findAllByBlogPostIdOrderByCreatedAtAsc(Long blogPostId);

    /** v2 backlog (threaded comments): how many replies a comment has — used by {@code CommentService.delete}/{@code deleteOnBlogPost} to keep the denormalized comment_count correct when a parent's cascade-deleted replies disappear along with it. */
    long countByParentCommentId(Long parentCommentId);

    /** v2 backlog: counter reconciliation — see {@code CommunityRepository.reconcileMemberCounts}'s javadoc for the pattern. Covers comments on both posts and blog posts, since {@code post_reactions.comment_id} doesn't distinguish the two. */
    @Modifying(clearAutomatically = true)
    @Query(value = "UPDATE post_comments pc "
            + "SET upvote_count = (SELECT COUNT(*) FROM post_reactions r WHERE r.comment_id = pc.id) "
            + "WHERE upvote_count <> (SELECT COUNT(*) FROM post_reactions r WHERE r.comment_id = pc.id)",
            nativeQuery = true)
    int reconcileUpvoteCounts();
}
