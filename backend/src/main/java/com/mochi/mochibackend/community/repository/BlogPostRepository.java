package com.mochi.mochibackend.community.repository;

import com.mochi.mochibackend.community.entity.BlogPost;
import com.mochi.mochibackend.community.enums.BlogStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BlogPostRepository extends JpaRepository<BlogPost, Long> {

    Optional<BlogPost> findByIdAndCommunityId(Long id, Long communityId);

    boolean existsByCommunityIdAndSlug(Long communityId, String slug);

    /** The public feed: published posts, newest-first by publish date. */
    List<BlogPost> findAllByCommunityIdAndStatusOrderByPublishedAtDesc(Long communityId, BlogStatus status);

    /** One author's own posts (drafts + published), for "my drafts" / author profile views. */
    List<BlogPost> findAllByCommunityIdAndAuthorUidOrderByCreatedAtDesc(Long communityId, String authorUid);

    /**
     * v2 backlog: full-text search — see {@code PostRepository.searchByCommunity}'s
     * javadoc for why this is a native query, and the {@code V23}
     * migration for why {@code body_plaintext} (not the raw markup
     * {@code body}) is what's indexed. Scoped to {@code status = 'PUBLISHED'}
     * only — a draft shouldn't turn up in another member's search
     * results, matching every other draft-visibility rule in
     * {@code BlogPostService}.
     */
    @Query(value = "SELECT * FROM blog_posts WHERE community_id = :communityId AND status = 'PUBLISHED' "
            + "AND MATCH(title, body_plaintext) AGAINST(:query IN NATURAL LANGUAGE MODE) "
            + "ORDER BY MATCH(title, body_plaintext) AGAINST(:query IN NATURAL LANGUAGE MODE) DESC "
            + "LIMIT :limit", nativeQuery = true)
    List<BlogPost> searchByCommunity(@Param("communityId") Long communityId, @Param("query") String query, @Param("limit") int limit);

    /** v2 backlog: counter reconciliation — see {@code CommunityRepository.reconcileMemberCounts}'s javadoc for the pattern. */
    @Modifying(clearAutomatically = true)
    @Query(value = "UPDATE blog_posts bp "
            + "SET upvote_count = (SELECT COUNT(*) FROM post_reactions r WHERE r.blog_post_id = bp.id) "
            + "WHERE upvote_count <> (SELECT COUNT(*) FROM post_reactions r WHERE r.blog_post_id = bp.id)",
            nativeQuery = true)
    int reconcileUpvoteCounts();

    /** Same, for {@code comment_count}. */
    @Modifying(clearAutomatically = true)
    @Query(value = "UPDATE blog_posts bp "
            + "SET comment_count = (SELECT COUNT(*) FROM post_comments c WHERE c.blog_post_id = bp.id) "
            + "WHERE comment_count <> (SELECT COUNT(*) FROM post_comments c WHERE c.blog_post_id = bp.id)",
            nativeQuery = true)
    int reconcileCommentCounts();
}
