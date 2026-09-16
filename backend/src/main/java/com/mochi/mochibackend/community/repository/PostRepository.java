package com.mochi.mochibackend.community.repository;

import com.mochi.mochibackend.community.entity.Post;
import com.mochi.mochibackend.community.enums.PostType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long> {

    Optional<Post> findByIdAndCommunityId(Long id, Long communityId);

    /** "New" sort: pinned first, then newest. Used when no {@code type} filter is given. */
    List<Post> findAllByCommunityIdOrderByPinnedDescCreatedAtDesc(Long communityId);

    /** "New" sort, scoped to one post type. */
    List<Post> findAllByCommunityIdAndTypeOrderByPinnedDescCreatedAtDesc(Long communityId, PostType type);

    /** "Top" sort: pinned first, then most-upvoted. */
    List<Post> findAllByCommunityIdOrderByPinnedDescUpvoteCountDescCreatedAtDesc(Long communityId);

    /** "Top" sort, scoped to one post type. */
    List<Post> findAllByCommunityIdAndTypeOrderByPinnedDescUpvoteCountDescCreatedAtDesc(Long communityId, PostType type);

    /**
     * v2 backlog: full-text search — see the {@code V23} migration's
     * header comment for why this is a plain MySQL FULLTEXT index
     * rather than a dedicated search service. The only native query in
     * this codebase; Spring Data's derived-query methods don't support
     * {@code MATCH ... AGAINST}, and a JPQL {@code function()} escape
     * hatch would be less readable than just writing the SQL. Results
     * are ranked by MySQL's own relevance score (the second
     * {@code MATCH ... AGAINST} in the ORDER BY, which computes the
     * same score used to filter WHERE — this is the standard MySQL
     * FULLTEXT relevance-ranking idiom, not a workaround).
     */
    @Query(value = "SELECT * FROM posts WHERE community_id = :communityId "
            + "AND MATCH(title, body) AGAINST(:query IN NATURAL LANGUAGE MODE) "
            + "ORDER BY MATCH(title, body) AGAINST(:query IN NATURAL LANGUAGE MODE) DESC "
            + "LIMIT :limit", nativeQuery = true)
    List<Post> searchByCommunity(@Param("communityId") Long communityId, @Param("query") String query, @Param("limit") int limit);

    /** v2 backlog: counter reconciliation — see {@code CommunityRepository.reconcileMemberCounts}'s javadoc for the pattern. */
    @Modifying(clearAutomatically = true)
    @Query(value = "UPDATE posts p "
            + "SET upvote_count = (SELECT COUNT(*) FROM post_reactions r WHERE r.post_id = p.id) "
            + "WHERE upvote_count <> (SELECT COUNT(*) FROM post_reactions r WHERE r.post_id = p.id)",
            nativeQuery = true)
    int reconcileUpvoteCounts();

    /** Same, for {@code comment_count}. */
    @Modifying(clearAutomatically = true)
    @Query(value = "UPDATE posts p "
            + "SET comment_count = (SELECT COUNT(*) FROM post_comments c WHERE c.post_id = p.id) "
            + "WHERE comment_count <> (SELECT COUNT(*) FROM post_comments c WHERE c.post_id = p.id)",
            nativeQuery = true)
    int reconcileCommentCounts();
}
