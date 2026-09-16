package com.mochi.mochibackend.community.service;

import com.mochi.mochibackend.community.dto.CreatePostRequest;
import com.mochi.mochibackend.community.dto.UpdatePostRequest;
import com.mochi.mochibackend.community.entity.Community;
import com.mochi.mochibackend.community.entity.CommunityMembership;
import com.mochi.mochibackend.community.entity.PollOption;
import com.mochi.mochibackend.community.entity.PollVote;
import com.mochi.mochibackend.community.entity.Post;
import com.mochi.mochibackend.community.enums.MembershipRole;
import com.mochi.mochibackend.community.enums.PostType;
import com.mochi.mochibackend.community.repository.PollOptionRepository;
import com.mochi.mochibackend.community.repository.PollVoteRepository;
import com.mochi.mochibackend.community.repository.PostRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.mochi.mochibackend.exception.AlreadyVotedException;
import com.mochi.mochibackend.exception.InvalidPostRequestException;
import com.mochi.mochibackend.exception.NotPostAuthorException;
import com.mochi.mochibackend.exception.PollOptionNotFoundException;
import com.mochi.mochibackend.exception.PostNotFoundException;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Community Rooms, Phase 2: the four short-post types (room share, help
 * request, vent, poll) — the original core loop, per the design doc's
 * build order.
 * <p>
 * Comments and reactions are Phase 3, living in their own
 * {@code CommentService}/{@code ReactionService} rather than growing
 * this class further — but both reuse {@link #getPostInCommunity} and
 * the count-adjustment helpers below rather than re-deriving "does this
 * post exist in this community" or touching {@code Post} fields
 * directly, so there's one place that owns what a valid post looks up
 * as.
 * <p>
 * Every mutation goes through {@code CommunityService} to resolve the
 * caller's standing first (must be an APPROVED member; moderator/admin
 * for pin and for editing/deleting someone else's post), same shape as
 * {@code CommunityService} itself follows relative to {@code TaskService}.
 */
@Service
public class PostService {

    private static final int MIN_POLL_OPTIONS = 2;
    private static final int MAX_POLL_OPTIONS = 10;

    private final PostRepository postRepository;
    private final PollOptionRepository pollOptionRepository;
    private final PollVoteRepository pollVoteRepository;
    private final CommunityService communityService;

    public PostService(
            PostRepository postRepository,
            PollOptionRepository pollOptionRepository,
            PollVoteRepository pollVoteRepository,
            CommunityService communityService) {
        this.postRepository = postRepository;
        this.pollOptionRepository = pollOptionRepository;
        this.pollVoteRepository = pollVoteRepository;
        this.communityService = communityService;
    }

    /**
     * Creates a post. The caller must be an APPROVED member of the
     * community. Type-specific validation happens here rather than via
     * Bean Validation, since which fields are required depends on
     * {@code request.getType()}:
     * <ul>
     *   <li>ROOM_SHARE — {@code studyRoomCode} required</li>
     *   <li>HELP_REQUEST, VENT — {@code body} required</li>
     *   <li>POLL — 2 to 10 non-blank {@code pollOptions} required; a
     *       {@code PollOption} row is created for each, in order</li>
     * </ul>
     */
    @Transactional
    public Post create(String userUid, String slug, CreatePostRequest request) {
        Community community = communityService.getBySlug(slug);
        communityService.requireApprovedMembership(community, userUid);
        validateForType(request);

        Post post = new Post();
        post.setCommunityId(community.getId());
        post.setAuthorUid(userUid);
        post.setType(request.getType());
        post.setTitle(request.getTitle());
        post.setBody(request.getBody());
        post.setAnonymous(request.isAnonymous());

        if (request.getType() == PostType.ROOM_SHARE) {
            post.setStudyRoomCode(request.getStudyRoomCode());
            post.setStudyRoomExpiresAt(request.getStudyRoomExpiresAt());
        }

        Post saved = postRepository.save(post);

        if (request.getType() == PostType.POLL) {
            int order = 0;
            for (String label : request.getPollOptions()) {
                PollOption option = new PollOption();
                option.setPostId(saved.getId());
                option.setLabel(label.trim());
                option.setDisplayOrder(order++);
                pollOptionRepository.save(option);
            }
        }

        return saved;
    }

    /**
     * The feed for one community. Caller must be an APPROVED member —
     * posts aren't visible to pending requesters or non-members, unlike
     * the community's own header (which discover/preview relies on).
     * {@code sort} defaults to newest-first (pinned always float to the
     * top either way); {@code "top"} sorts by {@code upvoteCount}
     * instead — a no-op ordering distinction until Phase 3 wires up
     * upvoting, but the parameter is honored now so the frontend doesn't
     * need a later contract change.
     */
    @Transactional(readOnly = true)
    public List<Post> list(String userUid, String slug, Optional<PostType> type, String sort) {
        Community community = communityService.getBySlug(slug);
        communityService.requireApprovedMembership(community, userUid);

        boolean top = "top".equalsIgnoreCase(sort);

        return type
                .map(t -> top
                        ? postRepository.findAllByCommunityIdAndTypeOrderByPinnedDescUpvoteCountDescCreatedAtDesc(community.getId(), t)
                        : postRepository.findAllByCommunityIdAndTypeOrderByPinnedDescCreatedAtDesc(community.getId(), t))
                .orElseGet(() -> top
                        ? postRepository.findAllByCommunityIdOrderByPinnedDescUpvoteCountDescCreatedAtDesc(community.getId())
                        : postRepository.findAllByCommunityIdOrderByPinnedDescCreatedAtDesc(community.getId()));
    }

    @Transactional(readOnly = true)
    public Post get(String userUid, String slug, Long postId) {
        Community community = communityService.getBySlug(slug);
        communityService.requireApprovedMembership(community, userUid);
        return requirePost(community.getId(), postId);
    }

    /** Poll options for a post, in display order. Empty for non-POLL posts. */
    @Transactional(readOnly = true)
    public List<PollOption> optionsFor(Long postId) {
        return pollOptionRepository.findAllByPostIdOrderByDisplayOrderAsc(postId);
    }

    /** Poll options for several posts at once, grouped by post id — used when mapping a whole feed page. */
    @Transactional(readOnly = true)
    public Map<Long, List<PollOption>> optionsForPosts(List<Long> postIds) {
        if (postIds.isEmpty()) {
            return Map.of();
        }
        return pollOptionRepository.findAllByPostIdInOrderByDisplayOrderAsc(postIds).stream()
                .collect(Collectors.groupingBy(PollOption::getPostId));
    }

    @Transactional(readOnly = true)
    public Optional<PollVote> findCallerVote(String userUid, Long postId) {
        return pollVoteRepository.findByPostIdAndUserUid(postId, userUid);
    }

    /** Same, batched across a feed page's post ids, keyed by postId. */
    @Transactional(readOnly = true)
    public Map<Long, PollVote> findCallerVotes(String userUid, List<Long> postIds) {
        if (postIds.isEmpty()) {
            return Map.of();
        }
        return pollVoteRepository.findAllByPostIdIn(postIds).stream()
                .filter(v -> v.getUserUid().equals(userUid))
                .collect(Collectors.toMap(PollVote::getPostId, v -> v));
    }

    /** Whether the caller may see the real author of {@code post}: they wrote it, or they're a moderator/admin. */
    @Transactional(readOnly = true)
    public boolean canRevealAuthor(String userUid, Community community, Post post) {
        if (!post.isAnonymous()) {
            return true;
        }
        if (post.getAuthorUid().equals(userUid)) {
            return true;
        }
        Optional<CommunityMembership> caller = communityService.findCallerMembership(userUid, community.getId());
        return caller.map(m -> m.getRole() == MembershipRole.MODERATOR || m.getRole() == MembershipRole.ADMIN)
                .orElse(false);
    }

    /** Title/body edit — author only. Type, anonymity, and poll options are immutable in Phase 2. */
    @Transactional
    public Post update(String userUid, String slug, Long postId, UpdatePostRequest request) {
        Community community = communityService.getBySlug(slug);
        communityService.requireApprovedMembership(community, userUid);
        Post post = requirePost(community.getId(), postId);

        if (!post.getAuthorUid().equals(userUid)) {
            throw new NotPostAuthorException("Only the author can edit this post");
        }

        if (StringUtils.hasText(request.getTitle())) {
            post.setTitle(request.getTitle());
        }
        if (request.getBody() != null) {
            post.setBody(request.getBody());
        }

        return postRepository.save(post);
    }

    /** Delete — the author, or any moderator/admin (moderation removal). */
    @Transactional
    public void delete(String userUid, String slug, Long postId) {
        Community community = communityService.getBySlug(slug);
        CommunityMembership caller = communityService.requireApprovedMembership(community, userUid);
        Post post = requirePost(community.getId(), postId);

        boolean isAuthor = post.getAuthorUid().equals(userUid);
        boolean isModOrAdmin = caller.getRole() == MembershipRole.MODERATOR || caller.getRole() == MembershipRole.ADMIN;
        if (!isAuthor && !isModOrAdmin) {
            throw new NotPostAuthorException("Only the author or a moderator can remove this post");
        }

        postRepository.delete(post);
    }

    /** Pin/unpin toggle — moderator/admin only. */
    @Transactional
    public Post togglePin(String userUid, String slug, Long postId) {
        Community community = communityService.getBySlug(slug);
        CommunityMembership caller = communityService.requireApprovedMembership(community, userUid);
        communityService.requireModeratorOrAdmin(caller);

        Post post = requirePost(community.getId(), postId);
        post.setPinned(!post.isPinned());
        return postRepository.save(post);
    }

    /**
     * Resolved/unresolved toggle — meant for HELP_REQUEST, but not
     * type-gated: an author or moderator marking any post "resolved" is
     * harmless even if the UI only surfaces this action for help
     * requests.
     */
    @Transactional
    public Post toggleResolved(String userUid, String slug, Long postId) {
        Community community = communityService.getBySlug(slug);
        CommunityMembership caller = communityService.requireApprovedMembership(community, userUid);
        Post post = requirePost(community.getId(), postId);

        boolean isAuthor = post.getAuthorUid().equals(userUid);
        boolean isModOrAdmin = caller.getRole() == MembershipRole.MODERATOR || caller.getRole() == MembershipRole.ADMIN;
        if (!isAuthor && !isModOrAdmin) {
            throw new NotPostAuthorException("Only the author or a moderator can resolve this post");
        }

        post.setResolved(!post.isResolved());
        return postRepository.save(post);
    }

    /**
     * Casts a vote on a POLL post. One vote per user per poll, enforced
     * both here (checked before insert) and at the database level
     * ({@code uk_poll_votes_post_user}) — votes are immutable in Phase 2,
     * there's no change-your-vote flow yet.
     */
    @Transactional
    public PollOption vote(String userUid, String slug, Long postId, Long optionId) {
        Community community = communityService.getBySlug(slug);
        communityService.requireApprovedMembership(community, userUid);
        Post post = requirePost(community.getId(), postId);

        if (post.getType() != PostType.POLL) {
            throw new InvalidPostRequestException("This post isn't a poll");
        }

        if (pollVoteRepository.findByPostIdAndUserUid(postId, userUid).isPresent()) {
            throw new AlreadyVotedException("You've already voted on this poll");
        }

        PollOption option = pollOptionRepository.findByIdAndPostId(optionId, postId)
                .orElseThrow(() -> new PollOptionNotFoundException("That option doesn't belong to this poll"));

        PollVote vote = new PollVote();
        vote.setPostId(postId);
        vote.setPollOptionId(option.getId());
        vote.setUserUid(userUid);
        pollVoteRepository.save(vote);

        option.setVoteCount(option.getVoteCount() + 1);
        return pollOptionRepository.save(option);
    }

    // ------------------------------------------------------------------

    /**
     * Public on purpose: {@code CommentService} and {@code ReactionService}
     * (Phase 3) both need "does this post exist in this community" and
     * reuse this rather than re-deriving it — same reasoning as
     * {@code CommunityService.requireApprovedMembership} being made
     * public in Phase 2.
     */
    @Transactional(readOnly = true)
    public Post getPostInCommunity(Community community, Long postId) {
        return requirePost(community.getId(), postId);
    }

    /** Applies {@code delta} to a post's denormalized upvote counter. Never goes negative. */
    @Transactional
    public void adjustUpvoteCount(Post post, int delta) {
        post.setUpvoteCount(Math.max(0, post.getUpvoteCount() + delta));
        postRepository.save(post);
    }

    /** Applies {@code delta} to a post's denormalized comment counter. Never goes negative. */
    @Transactional
    public void adjustCommentCount(Post post, int delta) {
        post.setCommentCount(Math.max(0, post.getCommentCount() + delta));
        postRepository.save(post);
    }

    private Post requirePost(Long communityId, Long postId) {
        return postRepository.findByIdAndCommunityId(postId, communityId)
                .orElseThrow(() -> new PostNotFoundException("Post not found"));
    }

    private void validateForType(CreatePostRequest request) {
        switch (request.getType()) {
            case ROOM_SHARE -> {
                if (!StringUtils.hasText(request.getStudyRoomCode())) {
                    throw new InvalidPostRequestException("A room share needs a study room code");
                }
            }
            case HELP_REQUEST, VENT -> {
                if (!StringUtils.hasText(request.getBody())) {
                    throw new InvalidPostRequestException("This post needs a body");
                }
            }
            case POLL -> {
                List<String> options = request.getPollOptions();
                if (options == null) {
                    throw new InvalidPostRequestException(
                            "A poll needs between " + MIN_POLL_OPTIONS + " and " + MAX_POLL_OPTIONS + " options");
                }
                List<String> nonBlank = options.stream()
                        .filter(StringUtils::hasText)
                        .map(String::trim)
                        .distinct()
                        .collect(Collectors.toList());
                if (nonBlank.size() < MIN_POLL_OPTIONS || nonBlank.size() > MAX_POLL_OPTIONS) {
                    throw new InvalidPostRequestException(
                            "A poll needs between " + MIN_POLL_OPTIONS + " and " + MAX_POLL_OPTIONS + " distinct options");
                }
                request.setPollOptions(nonBlank);
            }
        }
    }
}
