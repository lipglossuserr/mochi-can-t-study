package com.mochi.mochibackend.community.service;

import com.mochi.mochibackend.community.dto.CreateBlogPostRequest;
import com.mochi.mochibackend.community.dto.UpdateBlogPostRequest;
import com.mochi.mochibackend.community.entity.BlogPost;
import com.mochi.mochibackend.community.entity.Community;
import com.mochi.mochibackend.community.entity.CommunityMembership;
import com.mochi.mochibackend.community.enums.BlogStatus;
import com.mochi.mochibackend.community.enums.CommunityVisibility;
import com.mochi.mochibackend.community.enums.MembershipRole;
import com.mochi.mochibackend.community.enums.MembershipStatus;
import com.mochi.mochibackend.community.repository.BlogPostRepository;
import com.mochi.mochibackend.exception.BlogPostNotFoundException;
import com.mochi.mochibackend.exception.InvalidBlogPostRequestException;
import com.mochi.mochibackend.exception.NotBlogAuthorException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BlogPostServiceTest {

    private static final String SLUG = "iut";
    private static final String AUTHOR = "author-uid";
    private static final String OTHER_MEMBER = "other-uid";

    @Mock
    private BlogPostRepository blogPostRepository;

    @Mock
    private CommunityService communityService;

    private BlogPostService service;

    @BeforeEach
    void setUp() {
        Clock fixedClock = Clock.fixed(Instant.parse("2026-08-14T00:00:00Z"), ZoneOffset.UTC);
        service = new BlogPostService(blogPostRepository, communityService, fixedClock);

        lenient().when(communityService.getBySlug(SLUG)).thenReturn(community());
        lenient().when(blogPostRepository.save(any(BlogPost.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void createSavesADraftWithADerivedSlugAndReadingTime() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(AUTHOR)))
                .thenReturn(membershipOf(AUTHOR, MembershipRole.MEMBER));
        when(blogPostRepository.existsByCommunityIdAndSlug(eq(1L), any())).thenReturn(false);

        CreateBlogPostRequest request = new CreateBlogPostRequest();
        request.setTitle("How I Study For Finals");
        request.setBody("A short body with a handful of words in it.");

        BlogPost saved = service.create(AUTHOR, SLUG, request);

        assertThat(saved.getAuthorUid()).isEqualTo(AUTHOR);
        assertThat(saved.getStatus()).isEqualTo(BlogStatus.DRAFT);
        assertThat(saved.getSlug()).isEqualTo("how-i-study-for-finals");
        assertThat(saved.getReadingTimeMinutes()).isEqualTo(1);
        assertThat(saved.getBodyPlaintext()).doesNotContain("#");
    }

    @Test
    void createAppendsASuffixWhenTheSlugAlreadyExists() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(AUTHOR)))
                .thenReturn(membershipOf(AUTHOR, MembershipRole.MEMBER));
        when(blogPostRepository.existsByCommunityIdAndSlug(1L, "study-tips")).thenReturn(true);
        when(blogPostRepository.existsByCommunityIdAndSlug(1L, "study-tips-2")).thenReturn(false);

        CreateBlogPostRequest request = new CreateBlogPostRequest();
        request.setTitle("Study Tips");
        request.setBody("Body text.");

        BlogPost saved = service.create(AUTHOR, SLUG, request);

        assertThat(saved.getSlug()).isEqualTo("study-tips-2");
    }

    @Test
    void updateRejectsANonAuthor() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(OTHER_MEMBER)))
                .thenReturn(membershipOf(OTHER_MEMBER, MembershipRole.MEMBER));
        when(blogPostRepository.findByIdAndCommunityId(10L, 1L)).thenReturn(Optional.of(draftPost()));

        UpdateBlogPostRequest request = new UpdateBlogPostRequest();
        request.setTitle("New title");

        assertThatThrownBy(() -> service.update(OTHER_MEMBER, SLUG, 10L, request))
                .isInstanceOf(NotBlogAuthorException.class);
    }

    @Test
    void publishSetsPublishedAtOnlyOnce() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(AUTHOR)))
                .thenReturn(membershipOf(AUTHOR, MembershipRole.MEMBER));
        BlogPost draft = draftPost();
        when(blogPostRepository.findByIdAndCommunityId(10L, 1L)).thenReturn(Optional.of(draft));

        BlogPost published = service.publish(AUTHOR, SLUG, 10L);

        assertThat(published.getStatus()).isEqualTo(BlogStatus.PUBLISHED);
        assertThat(published.getPublishedAt()).isEqualTo(Instant.parse("2026-08-14T00:00:00Z"));
    }

    @Test
    void publishRejectsAPostWithNoBody() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(AUTHOR)))
                .thenReturn(membershipOf(AUTHOR, MembershipRole.MEMBER));
        BlogPost draft = draftPost();
        draft.setBody("");
        when(blogPostRepository.findByIdAndCommunityId(10L, 1L)).thenReturn(Optional.of(draft));

        assertThatThrownBy(() -> service.publish(AUTHOR, SLUG, 10L))
                .isInstanceOf(InvalidBlogPostRequestException.class);
    }

    @Test
    void getHidesADraftFromAPlainMember() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(OTHER_MEMBER)))
                .thenReturn(membershipOf(OTHER_MEMBER, MembershipRole.MEMBER));
        when(blogPostRepository.findByIdAndCommunityId(10L, 1L)).thenReturn(Optional.of(draftPost()));

        assertThatThrownBy(() -> service.get(OTHER_MEMBER, SLUG, 10L))
                .isInstanceOf(BlogPostNotFoundException.class);
    }

    @Test
    void getAllowsAModeratorToSeeADraft() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(OTHER_MEMBER)))
                .thenReturn(membershipOf(OTHER_MEMBER, MembershipRole.MODERATOR));
        when(blogPostRepository.findByIdAndCommunityId(10L, 1L)).thenReturn(Optional.of(draftPost()));

        BlogPost result = service.get(OTHER_MEMBER, SLUG, 10L);

        assertThat(result.getId()).isEqualTo(10L);
    }

    @Test
    void getPublishedBlogPostInCommunityRejectsADraft() {
        when(blogPostRepository.findByIdAndCommunityId(10L, 1L)).thenReturn(Optional.of(draftPost()));

        assertThatThrownBy(() -> service.getPublishedBlogPostInCommunity(community(), 10L))
                .isInstanceOf(BlogPostNotFoundException.class);
    }

    @Test
    void deleteAllowsAModeratorEvenWhenNotTheAuthor() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(OTHER_MEMBER)))
                .thenReturn(membershipOf(OTHER_MEMBER, MembershipRole.ADMIN));
        when(blogPostRepository.findByIdAndCommunityId(10L, 1L)).thenReturn(Optional.of(draftPost()));

        service.delete(OTHER_MEMBER, SLUG, 10L);

        verify(blogPostRepository).delete(any(BlogPost.class));
    }

    @Test
    void deleteRejectsANonAuthorNonModerator() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(OTHER_MEMBER)))
                .thenReturn(membershipOf(OTHER_MEMBER, MembershipRole.MEMBER));
        when(blogPostRepository.findByIdAndCommunityId(10L, 1L)).thenReturn(Optional.of(draftPost()));

        assertThatThrownBy(() -> service.delete(OTHER_MEMBER, SLUG, 10L))
                .isInstanceOf(NotBlogAuthorException.class);

        verify(blogPostRepository, never()).delete(any(BlogPost.class));
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

    private BlogPost draftPost() {
        BlogPost blogPost = new BlogPost();
        blogPost.setId(10L);
        blogPost.setCommunityId(1L);
        blogPost.setAuthorUid(AUTHOR);
        blogPost.setSlug("original-slug");
        blogPost.setTitle("Original title");
        blogPost.setBody("Original body");
        blogPost.setBodyPlaintext("Original body");
        blogPost.setStatus(BlogStatus.DRAFT);
        return blogPost;
    }
}
