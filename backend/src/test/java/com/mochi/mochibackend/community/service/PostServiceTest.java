package com.mochi.mochibackend.community.service;

import com.mochi.mochibackend.community.dto.CreatePostRequest;
import com.mochi.mochibackend.community.entity.Community;
import com.mochi.mochibackend.community.entity.CommunityMembership;
import com.mochi.mochibackend.community.entity.PollOption;
import com.mochi.mochibackend.community.entity.Post;
import com.mochi.mochibackend.community.enums.CommunityVisibility;
import com.mochi.mochibackend.community.enums.MembershipRole;
import com.mochi.mochibackend.community.enums.MembershipStatus;
import com.mochi.mochibackend.community.enums.PostType;
import com.mochi.mochibackend.community.repository.PollOptionRepository;
import com.mochi.mochibackend.community.repository.PollVoteRepository;
import com.mochi.mochibackend.community.repository.PostRepository;
import com.mochi.mochibackend.exception.AlreadyVotedException;
import com.mochi.mochibackend.exception.InvalidPostRequestException;
import com.mochi.mochibackend.exception.NotPostAuthorException;
import com.mochi.mochibackend.exception.PollOptionNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PostServiceTest {

    private static final String MEMBER = "member-uid";
    private static final String MODERATOR = "mod-uid";
    private static final String SLUG = "iut";

    @Mock
    private PostRepository postRepository;

    @Mock
    private PollOptionRepository pollOptionRepository;

    @Mock
    private PollVoteRepository pollVoteRepository;

    @Mock
    private CommunityService communityService;

    private PostService service;

    @BeforeEach
    void setUp() {
        service = new PostService(postRepository, pollOptionRepository, pollVoteRepository, communityService);

        lenient().when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(pollOptionRepository.save(any(PollOption.class))).thenAnswer(inv -> inv.getArgument(0));

        lenient().when(communityService.getBySlug(SLUG)).thenReturn(community());
        lenient().when(communityService.requireApprovedMembership(any(Community.class), any()))
                .thenReturn(membershipOf(MEMBER, MembershipRole.MEMBER));
    }

    // ---------- create: type validation ----------

    @Test
    void createRejectsARoomShareWithoutACode() {
        CreatePostRequest request = new CreatePostRequest();
        request.setType(PostType.ROOM_SHARE);
        request.setTitle("Anyone up for chem?");

        assertThatThrownBy(() -> service.create(MEMBER, SLUG, request))
                .isInstanceOf(InvalidPostRequestException.class);
    }

    @Test
    void createAcceptsARoomShareWithACode() {
        CreatePostRequest request = new CreatePostRequest();
        request.setType(PostType.ROOM_SHARE);
        request.setTitle("Anyone up for chem?");
        request.setStudyRoomCode("CHEM-101");

        Post post = service.create(MEMBER, SLUG, request);

        assertThat(post.getStudyRoomCode()).isEqualTo("CHEM-101");
        assertThat(post.getAuthorUid()).isEqualTo(MEMBER);
    }

    @Test
    void createRejectsAHelpRequestWithoutABody() {
        CreatePostRequest request = new CreatePostRequest();
        request.setType(PostType.HELP_REQUEST);
        request.setTitle("Stuck on integrals");

        assertThatThrownBy(() -> service.create(MEMBER, SLUG, request))
                .isInstanceOf(InvalidPostRequestException.class);
    }

    @Test
    void createRejectsAPollWithOnlyOneOption() {
        CreatePostRequest request = new CreatePostRequest();
        request.setType(PostType.POLL);
        request.setTitle("Study time?");
        request.setPollOptions(List.of("Morning"));

        assertThatThrownBy(() -> service.create(MEMBER, SLUG, request))
                .isInstanceOf(InvalidPostRequestException.class);
    }

    @Test
    void createBuildsAPollOptionPerDistinctNonBlankLabel() {
        CreatePostRequest request = new CreatePostRequest();
        request.setType(PostType.POLL);
        request.setTitle("Study time?");
        request.setPollOptions(List.of("Morning", "Evening", "  ", "Morning"));
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> {
            Post p = inv.getArgument(0);
            p.setId(42L);
            return p;
        });

        service.create(MEMBER, SLUG, request);

        // "Morning" deduped, blank dropped -> 2 distinct options saved
        org.mockito.Mockito.verify(pollOptionRepository, org.mockito.Mockito.times(2)).save(any(PollOption.class));
    }

    // ---------- voting ----------

    @Test
    void voteRejectsANonPollPost() {
        Post helpPost = existingPost(PostType.HELP_REQUEST);
        when(postRepository.findByIdAndCommunityId(1L, 1L)).thenReturn(Optional.of(helpPost));

        assertThatThrownBy(() -> service.vote(MEMBER, SLUG, 1L, 5L))
                .isInstanceOf(InvalidPostRequestException.class);
    }

    @Test
    void voteRejectsADoubleVote() {
        Post pollPost = existingPost(PostType.POLL);
        when(postRepository.findByIdAndCommunityId(1L, 1L)).thenReturn(Optional.of(pollPost));
        when(pollVoteRepository.findByPostIdAndUserUid(1L, MEMBER))
                .thenReturn(Optional.of(new com.mochi.mochibackend.community.entity.PollVote()));

        assertThatThrownBy(() -> service.vote(MEMBER, SLUG, 1L, 5L))
                .isInstanceOf(AlreadyVotedException.class);
    }

    @Test
    void voteRejectsAnOptionFromAnotherPoll() {
        Post pollPost = existingPost(PostType.POLL);
        when(postRepository.findByIdAndCommunityId(1L, 1L)).thenReturn(Optional.of(pollPost));
        when(pollVoteRepository.findByPostIdAndUserUid(1L, MEMBER)).thenReturn(Optional.empty());
        when(pollOptionRepository.findByIdAndPostId(999L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.vote(MEMBER, SLUG, 1L, 999L))
                .isInstanceOf(PollOptionNotFoundException.class);
    }

    @Test
    void voteIncrementsTheOptionsCount() {
        Post pollPost = existingPost(PostType.POLL);
        PollOption option = new PollOption();
        option.setId(5L);
        option.setPostId(1L);
        option.setVoteCount(3);

        when(postRepository.findByIdAndCommunityId(1L, 1L)).thenReturn(Optional.of(pollPost));
        when(pollVoteRepository.findByPostIdAndUserUid(1L, MEMBER)).thenReturn(Optional.empty());
        when(pollOptionRepository.findByIdAndPostId(5L, 1L)).thenReturn(Optional.of(option));

        PollOption result = service.vote(MEMBER, SLUG, 1L, 5L);

        assertThat(result.getVoteCount()).isEqualTo(4);
    }

    // ---------- edit / delete standing ----------

    @Test
    void updateRejectsSomeoneWhoIsNotTheAuthor() {
        Post post = existingPost(PostType.VENT);
        post.setAuthorUid("someone-else");
        when(postRepository.findByIdAndCommunityId(1L, 1L)).thenReturn(Optional.of(post));

        assertThatThrownBy(() -> service.update(MEMBER, SLUG, 1L, new com.mochi.mochibackend.community.dto.UpdatePostRequest()))
                .isInstanceOf(NotPostAuthorException.class);
    }

    // ---------- helpers ----------

    private Community community() {
        Community community = new Community();
        community.setId(1L);
        community.setSlug(SLUG);
        community.setName("iUT");
        community.setVisibility(CommunityVisibility.PUBLIC);
        return community;
    }

    private CommunityMembership membershipOf(String uid, MembershipRole role) {
        CommunityMembership membership = new CommunityMembership();
        membership.setCommunityId(1L);
        membership.setUserUid(uid);
        membership.setRole(role);
        membership.setStatus(MembershipStatus.APPROVED);
        return membership;
    }

    private Post existingPost(PostType type) {
        Post post = new Post();
        post.setId(1L);
        post.setCommunityId(1L);
        post.setAuthorUid(MEMBER);
        post.setType(type);
        post.setTitle("Title");
        return post;
    }
}
