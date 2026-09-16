package com.mochi.mochibackend.community.service;

import com.mochi.mochibackend.community.repository.BlogPostRepository;
import com.mochi.mochibackend.community.repository.CommentRepository;
import com.mochi.mochibackend.community.repository.CommunityRepository;
import com.mochi.mochibackend.community.repository.PostRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Community Rooms, v2 backlog: reconciles every denormalized counter
 * in this feature against its source of truth. The design doc flags
 * this as real, well-understood tech debt ("guard with
 * {@code @Version} optimistic locking or a periodic reconciliation
 * job; don't let these drift silently") — {@code @Version} already
 * guards concurrent writes to the same row (see every entity's
 * {@code version} column), but it does nothing for drift introduced by
 * a bug, a failed-but-partially-applied transaction, or manual data
 * fixes. This job is the other half: an independent, periodic
 * ground-truth recount.
 * <p>
 * Runs nightly at 3am server time — off-peak, and frequent enough that
 * any drift is corrected well within a day. Each counter is corrected
 * via one bulk {@code UPDATE ... WHERE <counter> <> <recount>}
 * statement (see e.g. {@code CommunityRepository.reconcileMemberCounts})
 * rather than looping every row in Java: a healthy table with zero
 * drift does zero writes, and a drifted table gets fixed in one
 * statement instead of N.
 * <p>
 * No manual-trigger endpoint exists yet — only this scheduled 3am run.
 * That's a deliberate gap, not an oversight: this job is inherently
 * cross-community (it reconciles every community's counters in one
 * pass), and this app currently has no site-wide admin concept to gate
 * such an endpoint behind — only per-community roles (MEMBER/MODERATOR/
 * ADMIN), none of which is the right fit for "trigger a global
 * maintenance job." Add a manual trigger once/if this app gains a
 * real site-admin layer; until then, {@code runNow()} is callable
 * directly (e.g. from a test or a one-off admin shell) if drift needs
 * fixing before the next scheduled run.
 */
@Service
public class CounterReconciliationService {

    private static final Logger log = LoggerFactory.getLogger(CounterReconciliationService.class);

    private final CommunityRepository communityRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final BlogPostRepository blogPostRepository;

    public CounterReconciliationService(
            CommunityRepository communityRepository,
            PostRepository postRepository,
            CommentRepository commentRepository,
            BlogPostRepository blogPostRepository) {
        this.communityRepository = communityRepository;
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.blogPostRepository = blogPostRepository;
    }

    @Scheduled(cron = "0 0 3 * * *")
    public void runScheduled() {
        runNow();
    }

    /**
     * Runs every reconciliation query and logs how many rows each one
     * corrected. Each counter is its own transaction (via the
     * repository method's own {@code @Modifying} query, executed here
     * inside one outer read-write transaction) — deliberately not
     * split into six separate top-level transactions, so a single
     * "reconciliation run" is one atomic unit in the logs even though
     * each individual UPDATE is independent of the others.
     */
    @Transactional
    public void runNow() {
        int communities = communityRepository.reconcileMemberCounts();
        int postUpvotes = postRepository.reconcileUpvoteCounts();
        int postComments = postRepository.reconcileCommentCounts();
        int commentUpvotes = commentRepository.reconcileUpvoteCounts();
        int blogUpvotes = blogPostRepository.reconcileUpvoteCounts();
        int blogComments = blogPostRepository.reconcileCommentCounts();

        int totalCorrected = communities + postUpvotes + postComments + commentUpvotes + blogUpvotes + blogComments;
        if (totalCorrected > 0) {
            log.warn(
                    "Counter reconciliation corrected drift: communities.member_count={}, posts.upvote_count={}, "
                            + "posts.comment_count={}, post_comments.upvote_count={}, blog_posts.upvote_count={}, "
                            + "blog_posts.comment_count={}",
                    communities, postUpvotes, postComments, commentUpvotes, blogUpvotes, blogComments);
        } else {
            log.info("Counter reconciliation ran clean — no drift found");
        }
    }
}
