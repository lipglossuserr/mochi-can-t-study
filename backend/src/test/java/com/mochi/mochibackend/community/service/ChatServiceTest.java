package com.mochi.mochibackend.community.service;

import com.google.cloud.firestore.Firestore;
import com.mochi.mochibackend.community.entity.Community;
import com.mochi.mochibackend.community.entity.CommunityMembership;
import com.mochi.mochibackend.community.enums.CommunityVisibility;
import com.mochi.mochibackend.community.enums.MembershipRole;
import com.mochi.mochibackend.community.enums.MembershipStatus;
import com.mochi.mochibackend.exception.InsufficientCommunityRoleException;
import com.mochi.mochibackend.exception.InvalidChatMessageException;
import com.mochi.mochibackend.exception.NotCommunityMemberException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Covers the guard clauses that run before {@code ChatService} ever
 * touches Firestore — body validation and the MySQL-backed membership
 * check. What this deliberately does NOT cover: the transaction body
 * itself (the atomic rate-limit check + message write). Mockito can
 * mock {@code Firestore.runTransaction}'s shape, but doing so
 * meaningfully would mean re-implementing Firestore's own transaction
 * semantics in the test — at that point the test would be asserting
 * against a mock of my own design, not against real Firestore
 * behavior. That path genuinely needs the Firestore emulator (the same
 * gap {@code CommunityServiceTest}'s Firestore-mirror-sync tests
 * already flag); this class is honest about stopping short of it
 * rather than presenting a hollow test as coverage.
 * <p>
 * Uses {@code any(Community.class)}, not {@code eq(someCommunity())},
 * to match the entity argument on {@code requireApprovedMembership} —
 * {@code Community} has no {@code equals()} override, so two
 * separately-constructed instances are never equal even with identical
 * fields; matching on type instead of value is the correct approach
 * here (same convention {@code ReportServiceTest} already uses).
 */
@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    private static final String SLUG = "iut";
    private static final String USER = "user-uid";

    @Mock
    private Firestore firestore;

    @Mock
    private CommunityService communityService;

    private ChatService service;

    @BeforeEach
    void setUp() {
        Clock fixedClock = Clock.fixed(Instant.parse("2026-08-14T00:00:00Z"), ZoneOffset.UTC);
        service = new ChatService(firestore, communityService, fixedClock);
        lenient().when(communityService.getBySlug(SLUG)).thenReturn(community());
    }

    @Test
    void rejectsAnEmptyMessage() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(USER)))
                .thenReturn(membershipOf(USER));

        assertThatThrownBy(() -> service.sendMessage(USER, SLUG, "   "))
                .isInstanceOf(InvalidChatMessageException.class);
    }

    @Test
    void rejectsAMessageOverTheLengthLimit() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(USER)))
                .thenReturn(membershipOf(USER));

        String tooLong = "a".repeat(2001);

        assertThatThrownBy(() -> service.sendMessage(USER, SLUG, tooLong))
                .isInstanceOf(InvalidChatMessageException.class);
    }

    @Test
    void rejectsANonMemberBeforeEverTouchingFirestore() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(USER)))
                .thenThrow(new NotCommunityMemberException("not a member"));

        assertThatThrownBy(() -> service.sendMessage(USER, SLUG, "hi!"))
                .isInstanceOf(NotCommunityMemberException.class);
    }

    @Test
    void rejectsAPendingMemberBeforeEverTouchingFirestore() {
        when(communityService.requireApprovedMembership(any(Community.class), eq(USER)))
                .thenThrow(new InsufficientCommunityRoleException("not approved yet"));

        assertThatThrownBy(() -> service.sendMessage(USER, SLUG, "hi!"))
                .isInstanceOf(InsufficientCommunityRoleException.class);
    }

    private Community community() {
        Community community = new Community();
        community.setId(1L);
        community.setSlug(SLUG);
        community.setName("iUT");
        community.setVisibility(CommunityVisibility.PUBLIC);
        return community;
    }

    private CommunityMembership membershipOf(String uid) {
        CommunityMembership membership = new CommunityMembership();
        membership.setCommunityId(1L);
        membership.setUserUid(uid);
        membership.setRole(MembershipRole.MEMBER);
        membership.setStatus(MembershipStatus.APPROVED);
        return membership;
    }
}
