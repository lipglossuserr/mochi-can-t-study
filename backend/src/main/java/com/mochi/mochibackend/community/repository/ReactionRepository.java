package com.mochi.mochibackend.community.repository;

import com.mochi.mochibackend.community.entity.Reaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReactionRepository extends JpaRepository<Reaction, Long> {

    Optional<Reaction> findByPostIdAndUserUid(Long postId, String userUid);

    Optional<Reaction> findByCommentIdAndUserUid(Long commentId, String userUid);

    /** Batched lookup for rendering a whole feed page's "did I upvote this" flags in one query. */
    List<Reaction> findAllByPostIdInAndUserUid(List<Long> postIds, String userUid);

    /** Same, for a post's comment list. */
    List<Reaction> findAllByCommentIdInAndUserUid(List<Long> commentIds, String userUid);

    /** Phase 4: same lookup, for a blog post. */
    Optional<Reaction> findByBlogPostIdAndUserUid(Long blogPostId, String userUid);

    /** Batched "did I upvote this" for a blog feed page. */
    List<Reaction> findAllByBlogPostIdInAndUserUid(List<Long> blogPostIds, String userUid);
}
