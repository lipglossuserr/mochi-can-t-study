package com.mochi.mochibackend.community.service;

import com.mochi.mochibackend.community.dto.CreateCommunityRequest;
import com.mochi.mochibackend.community.dto.UpdateCommunityRequest;
import com.mochi.mochibackend.community.entity.Community;
import com.mochi.mochibackend.community.entity.CommunityMembership;
import com.mochi.mochibackend.community.enums.CommunityVisibility;
import com.mochi.mochibackend.community.enums.MembershipRole;
import com.mochi.mochibackend.community.enums.MembershipStatus;
import com.mochi.mochibackend.community.firestore.CommunityMemberMirrorRepository;
import com.mochi.mochibackend.community.repository.CommunityMembershipRepository;
import com.mochi.mochibackend.community.repository.CommunityRepository;
import com.mochi.mochibackend.exception.BannedFromCommunityException;
import com.mochi.mochibackend.exception.InsufficientCommunityRoleException;
import com.mochi.mochibackend.exception.LastAdminCannotBeDemotedException;
import com.mochi.mochibackend.exception.NotCommunityMemberException;
import com.mochi.mochibackend.exception.SoleAdminCannotLeaveException;
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
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommunityServiceTest {

    private static final String FOUNDER = "founder-uid";
    private static final String OTHER = "other-uid";
    private static final Instant NOW = Instant.parse("2026-08-13T10:00:00Z");

    @Mock
    private CommunityRepository communityRepository;

    @Mock
    private CommunityMembershipRepository membershipRepository;

    @Mock
    private CommunityMemberMirrorRepository mirrorRepository;

    private CommunityService service;

    @BeforeEach
    void setUp() {
        Clock fixed = Clock.fixed(NOW, ZoneOffset.UTC);
        service = new CommunityService(communityRepository, membershipRepository, mirrorRepository, fixed);

        lenient().when(communityRepository.save(any(Community.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(membershipRepository.save(any(CommunityMembership.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ---------- create ----------

    @Test
    void createGrantsTheFounderAnApprovedAdminMembership() {
        CreateCommunityRequest request = new CreateCommunityRequest();
        request.setName("iUT");
        when(communityRepository.existsBySlug("iut")).thenReturn(false);

        Community created = service.create(FOUNDER, request);

        assertThat(created.getSlug()).isEqualTo("iut");
        assertThat(created.getVisibility()).isEqualTo(CommunityVisibility.PUBLIC);
        assertThat(created.getMemberCount()).isEqualTo(1);
        assertThat(created.getCreatedByUid()).isEqualTo(FOUNDER);
    }

    @Test
    void createDerivesADashSlugFromAMultiWordNameAndDedupesOnCollision() {
        CreateCommunityRequest request = new CreateCommunityRequest();
        request.setName("Late Night Study Crew!!");
        when(communityRepository.existsBySlug("late-night-study-crew")).thenReturn(true);
        when(communityRepository.existsBySlug("late-night-study-crew-2")).thenReturn(false);

        Community created = service.create(FOUNDER, request);

        assertThat(created.getSlug()).isEqualTo("late-night-study-crew-2");
    }

    // ---------- join ----------

    @Test
    void joinApprovesInstantlyForAPublicCommunity() {
        Community community = publicCommunity();
        when(communityRepository.findBySlug("iut")).thenReturn(Optional.of(community));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, OTHER)).thenReturn(Optional.empty());

        CommunityMembership membership = service.join(OTHER, "iut");

        assertThat(membership.getStatus()).isEqualTo(MembershipStatus.APPROVED);
        assertThat(membership.getRole()).isEqualTo(MembershipRole.MEMBER);
        assertThat(community.getMemberCount()).isEqualTo(2); // started at 1
    }

    @Test
    void joinLeavesAsPendingForAPrivateCommunityAndDoesNotBumpMemberCount() {
        Community community = privateCommunity();
        when(communityRepository.findBySlug("iut-private")).thenReturn(Optional.of(community));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, OTHER)).thenReturn(Optional.empty());

        CommunityMembership membership = service.join(OTHER, "iut-private");

        assertThat(membership.getStatus()).isEqualTo(MembershipStatus.PENDING);
        assertThat(membership.getDecidedAt()).isNull();
        assertThat(community.getMemberCount()).isEqualTo(1); // unchanged
    }

    @Test
    void joinIsIdempotentForAnAlreadyPendingRequest() {
        Community community = privateCommunity();
        CommunityMembership pending = membershipOf(OTHER, MembershipRole.MEMBER, MembershipStatus.PENDING);
        when(communityRepository.findBySlug("iut-private")).thenReturn(Optional.of(community));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, OTHER)).thenReturn(Optional.of(pending));

        CommunityMembership result = service.join(OTHER, "iut-private");

        assertThat(result).isSameAs(pending);
        assertThat(community.getMemberCount()).isEqualTo(1);
    }

    @Test
    void joinRejectsABannedUser() {
        Community community = publicCommunity();
        CommunityMembership banned = membershipOf(OTHER, MembershipRole.MEMBER, MembershipStatus.BANNED);
        when(communityRepository.findBySlug("iut")).thenReturn(Optional.of(community));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, OTHER)).thenReturn(Optional.of(banned));

        assertThatThrownBy(() -> service.join(OTHER, "iut"))
                .isInstanceOf(BannedFromCommunityException.class);
    }

    // ---------- leave ----------

    @Test
    void leaveBlocksTheSoleRemainingAdmin() {
        Community community = publicCommunity();
        CommunityMembership adminMembership = membershipOf(FOUNDER, MembershipRole.ADMIN, MembershipStatus.APPROVED);
        when(communityRepository.findBySlug("iut")).thenReturn(Optional.of(community));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, FOUNDER)).thenReturn(Optional.of(adminMembership));
        when(membershipRepository.countByCommunityIdAndRoleAndStatus(1L, MembershipRole.ADMIN, MembershipStatus.APPROVED))
                .thenReturn(1L);

        assertThatThrownBy(() -> service.leave(FOUNDER, "iut"))
                .isInstanceOf(SoleAdminCannotLeaveException.class);
    }

    @Test
    void leaveRejectsANonMember() {
        Community community = publicCommunity();
        when(communityRepository.findBySlug("iut")).thenReturn(Optional.of(community));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, OTHER)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.leave(OTHER, "iut"))
                .isInstanceOf(NotCommunityMemberException.class);
    }

    // ---------- approve ----------

    @Test
    void approveRejectsACallerWhoIsOnlyAPlainMember() {
        Community community = privateCommunity();
        CommunityMembership callerMembership = membershipOf(OTHER, MembershipRole.MEMBER, MembershipStatus.APPROVED);
        when(communityRepository.findBySlug("iut-private")).thenReturn(Optional.of(community));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, OTHER)).thenReturn(Optional.of(callerMembership));

        assertThatThrownBy(() -> service.approve(OTHER, "iut-private", "some-requester"))
                .isInstanceOf(InsufficientCommunityRoleException.class);
    }

    @Test
    void approveByAModeratorApprovesAPendingRequestAndBumpsMemberCount() {
        Community community = privateCommunity();
        CommunityMembership moderatorMembership = membershipOf(OTHER, MembershipRole.MODERATOR, MembershipStatus.APPROVED);
        CommunityMembership pendingRequest = membershipOf("requester", MembershipRole.MEMBER, MembershipStatus.PENDING);
        when(communityRepository.findBySlug("iut-private")).thenReturn(Optional.of(community));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, OTHER)).thenReturn(Optional.of(moderatorMembership));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, "requester")).thenReturn(Optional.of(pendingRequest));

        CommunityMembership result = service.approve(OTHER, "iut-private", "requester");

        assertThat(result.getStatus()).isEqualTo(MembershipStatus.APPROVED);
        assertThat(result.getDecidedByUid()).isEqualTo(OTHER);
        assertThat(community.getMemberCount()).isEqualTo(2); // started at 1
    }

    // ---------- ban ----------

    @Test
    void banDemotesAnApprovedMemberAndDecrementsMemberCount() {
        Community community = publicCommunity();
        community.setMemberCount(2);
        CommunityMembership callerMembership = membershipOf(FOUNDER, MembershipRole.ADMIN, MembershipStatus.APPROVED);
        CommunityMembership targetMembership = membershipOf(OTHER, MembershipRole.MEMBER, MembershipStatus.APPROVED);
        when(communityRepository.findBySlug("iut")).thenReturn(Optional.of(community));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, FOUNDER)).thenReturn(Optional.of(callerMembership));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, OTHER)).thenReturn(Optional.of(targetMembership));

        CommunityMembership result = service.ban(FOUNDER, "iut", OTHER);

        assertThat(result.getStatus()).isEqualTo(MembershipStatus.BANNED);
        assertThat(community.getMemberCount()).isEqualTo(1);
    }

    @Test
    void banRefusesToBanAnAdmin() {
        Community community = publicCommunity();
        CommunityMembership callerMembership = membershipOf(FOUNDER, MembershipRole.ADMIN, MembershipStatus.APPROVED);
        CommunityMembership targetMembership = membershipOf(OTHER, MembershipRole.ADMIN, MembershipStatus.APPROVED);
        when(communityRepository.findBySlug("iut")).thenReturn(Optional.of(community));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, FOUNDER)).thenReturn(Optional.of(callerMembership));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, OTHER)).thenReturn(Optional.of(targetMembership));

        assertThatThrownBy(() -> service.ban(FOUNDER, "iut", OTHER))
                .isInstanceOf(InsufficientCommunityRoleException.class);
    }

    // ---------- changeRole ----------

    @Test
    void changeRoleRejectsACallerWhoIsOnlyAModerator() {
        Community community = publicCommunity();
        CommunityMembership callerMembership = membershipOf(OTHER, MembershipRole.MODERATOR, MembershipStatus.APPROVED);
        when(communityRepository.findBySlug("iut")).thenReturn(Optional.of(community));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, OTHER)).thenReturn(Optional.of(callerMembership));

        assertThatThrownBy(() -> service.changeRole(OTHER, "iut", "someone-else", MembershipRole.MODERATOR))
                .isInstanceOf(InsufficientCommunityRoleException.class);
    }

    @Test
    void changeRolePromotesAMemberToModerator() {
        Community community = publicCommunity();
        CommunityMembership callerMembership = membershipOf(FOUNDER, MembershipRole.ADMIN, MembershipStatus.APPROVED);
        CommunityMembership targetMembership = membershipOf(OTHER, MembershipRole.MEMBER, MembershipStatus.APPROVED);
        when(communityRepository.findBySlug("iut")).thenReturn(Optional.of(community));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, FOUNDER)).thenReturn(Optional.of(callerMembership));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, OTHER)).thenReturn(Optional.of(targetMembership));

        CommunityMembership result = service.changeRole(FOUNDER, "iut", OTHER, MembershipRole.MODERATOR);

        assertThat(result.getRole()).isEqualTo(MembershipRole.MODERATOR);
    }

    @Test
    void changeRoleRefusesToDemoteTheSoleRemainingAdmin() {
        Community community = publicCommunity();
        CommunityMembership callerMembership = membershipOf(FOUNDER, MembershipRole.ADMIN, MembershipStatus.APPROVED);
        when(communityRepository.findBySlug("iut")).thenReturn(Optional.of(community));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, FOUNDER)).thenReturn(Optional.of(callerMembership));
        when(membershipRepository.countByCommunityIdAndRoleAndStatus(1L, MembershipRole.ADMIN, MembershipStatus.APPROVED))
                .thenReturn(1L);

        assertThatThrownBy(() -> service.changeRole(FOUNDER, "iut", FOUNDER, MembershipRole.MODERATOR))
                .isInstanceOf(LastAdminCannotBeDemotedException.class);
    }

    @Test
    void changeRoleAllowsDemotingAnAdminWhenAnotherAdminRemains() {
        Community community = publicCommunity();
        CommunityMembership callerMembership = membershipOf(FOUNDER, MembershipRole.ADMIN, MembershipStatus.APPROVED);
        CommunityMembership targetMembership = membershipOf(OTHER, MembershipRole.ADMIN, MembershipStatus.APPROVED);
        when(communityRepository.findBySlug("iut")).thenReturn(Optional.of(community));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, FOUNDER)).thenReturn(Optional.of(callerMembership));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, OTHER)).thenReturn(Optional.of(targetMembership));
        when(membershipRepository.countByCommunityIdAndRoleAndStatus(1L, MembershipRole.ADMIN, MembershipStatus.APPROVED))
                .thenReturn(2L);

        CommunityMembership result = service.changeRole(FOUNDER, "iut", OTHER, MembershipRole.MODERATOR);

        assertThat(result.getRole()).isEqualTo(MembershipRole.MODERATOR);
    }

    // ---------- update (v2 backlog: edit icon/name/description) ----------

    @Test
    void updateRejectsACallerWhoIsOnlyAModerator() {
        Community community = publicCommunity();
        CommunityMembership callerMembership = membershipOf(OTHER, MembershipRole.MODERATOR, MembershipStatus.APPROVED);
        when(communityRepository.findBySlug("iut")).thenReturn(Optional.of(community));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, OTHER)).thenReturn(Optional.of(callerMembership));

        UpdateCommunityRequest request = new UpdateCommunityRequest();
        request.setName("New name");

        assertThatThrownBy(() -> service.update(OTHER, "iut", request))
                .isInstanceOf(InsufficientCommunityRoleException.class);
    }

    @Test
    void updateSetsOnlyTheFieldsProvided() {
        Community community = publicCommunity();
        community.setDescription("original description");
        CommunityMembership callerMembership = membershipOf(FOUNDER, MembershipRole.ADMIN, MembershipStatus.APPROVED);
        when(communityRepository.findBySlug("iut")).thenReturn(Optional.of(community));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, FOUNDER)).thenReturn(Optional.of(callerMembership));
        when(communityRepository.save(any(Community.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateCommunityRequest request = new UpdateCommunityRequest();
        request.setIconUrl("https://example.com/icon.png");

        Community result = service.update(FOUNDER, "iut", request);

        assertThat(result.getIconUrl()).isEqualTo("https://example.com/icon.png");
        assertThat(result.getDescription()).isEqualTo("original description");
    }

    @Test
    void updateClearsTheIconWhenGivenABlankString() {
        Community community = publicCommunity();
        community.setIconUrl("https://example.com/old-icon.png");
        CommunityMembership callerMembership = membershipOf(FOUNDER, MembershipRole.ADMIN, MembershipStatus.APPROVED);
        when(communityRepository.findBySlug("iut")).thenReturn(Optional.of(community));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, FOUNDER)).thenReturn(Optional.of(callerMembership));
        when(communityRepository.save(any(Community.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateCommunityRequest request = new UpdateCommunityRequest();
        request.setIconUrl("");

        Community result = service.update(FOUNDER, "iut", request);

        assertThat(result.getIconUrl()).isNull();
    }

    // ---------- Firestore member-mirror sync (Phase 6) ----------
    //
    // These stand in for the "integration test that asserts [Firestore
    // Security Rules and Spring Security] never diverge" the design doc
    // calls for — short of a real Firestore emulator in this sandbox,
    // asserting CommunityService calls the mirror repository with the
    // exact role/status the MySQL row just got is the closest testable
    // proxy: it pins the *shape* of the sync contract, even though it
    // can't verify Firestore itself received and applied the write.

    @Test
    void createSyncsTheFounderAsApprovedAdminInTheMirror() {
        CreateCommunityRequest request = new CreateCommunityRequest();
        request.setName("iUT");
        when(communityRepository.existsBySlug("iut")).thenReturn(false);

        Community created = service.create(FOUNDER, request);

        verify(mirrorRepository).upsert(created.getId(), FOUNDER, "ADMIN", "APPROVED");
    }

    @Test
    void joinSyncsApprovedMemberInThePublicCase() {
        Community community = publicCommunity();
        when(communityRepository.findBySlug("iut")).thenReturn(Optional.of(community));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, OTHER)).thenReturn(Optional.empty());

        service.join(OTHER, "iut");

        verify(mirrorRepository).upsert(1L, OTHER, "MEMBER", "APPROVED");
    }

    @Test
    void joinSyncsPendingMemberInThePrivateCase() {
        Community community = privateCommunity();
        when(communityRepository.findBySlug("iut-private")).thenReturn(Optional.of(community));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, OTHER)).thenReturn(Optional.empty());

        service.join(OTHER, "iut-private");

        verify(mirrorRepository).upsert(1L, OTHER, "MEMBER", "PENDING");
    }

    @Test
    void leaveDeletesTheMirrorDocRatherThanUpsertingIt() {
        Community community = publicCommunity();
        community.setMemberCount(2);
        CommunityMembership membership = membershipOf(OTHER, MembershipRole.MEMBER, MembershipStatus.APPROVED);
        when(communityRepository.findBySlug("iut")).thenReturn(Optional.of(community));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, OTHER)).thenReturn(Optional.of(membership));

        service.leave(OTHER, "iut");

        verify(mirrorRepository).delete(1L, OTHER);
        verify(mirrorRepository, never()).upsert(any(), any(), any(), any());
    }

    @Test
    void approveSyncsTheNewApprovedStatusInTheMirror() {
        Community community = privateCommunity();
        CommunityMembership approver = membershipOf(FOUNDER, MembershipRole.ADMIN, MembershipStatus.APPROVED);
        CommunityMembership pending = membershipOf(OTHER, MembershipRole.MEMBER, MembershipStatus.PENDING);
        when(communityRepository.findBySlug("iut-private")).thenReturn(Optional.of(community));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, FOUNDER)).thenReturn(Optional.of(approver));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, OTHER)).thenReturn(Optional.of(pending));

        service.approve(FOUNDER, "iut-private", OTHER);

        verify(mirrorRepository).upsert(1L, OTHER, "MEMBER", "APPROVED");
    }

    @Test
    void banSyncsTheBannedStatusInTheMirror() {
        Community community = publicCommunity();
        CommunityMembership caller = membershipOf(FOUNDER, MembershipRole.ADMIN, MembershipStatus.APPROVED);
        CommunityMembership target = membershipOf(OTHER, MembershipRole.MEMBER, MembershipStatus.APPROVED);
        when(communityRepository.findBySlug("iut")).thenReturn(Optional.of(community));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, FOUNDER)).thenReturn(Optional.of(caller));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, OTHER)).thenReturn(Optional.of(target));

        service.ban(FOUNDER, "iut", OTHER);

        verify(mirrorRepository).upsert(1L, OTHER, "MEMBER", "BANNED");
    }

    @Test
    void changeRoleSyncsTheNewRoleInTheMirror() {
        Community community = publicCommunity();
        CommunityMembership caller = membershipOf(FOUNDER, MembershipRole.ADMIN, MembershipStatus.APPROVED);
        CommunityMembership target = membershipOf(OTHER, MembershipRole.MEMBER, MembershipStatus.APPROVED);
        when(communityRepository.findBySlug("iut")).thenReturn(Optional.of(community));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, FOUNDER)).thenReturn(Optional.of(caller));
        when(membershipRepository.findByCommunityIdAndUserUid(1L, OTHER)).thenReturn(Optional.of(target));

        service.changeRole(FOUNDER, "iut", OTHER, MembershipRole.MODERATOR);

        verify(mirrorRepository).upsert(1L, OTHER, "MODERATOR", "APPROVED");
    }

    // ---------- helpers ----------

    private Community publicCommunity() {
        Community community = new Community();
        community.setId(1L);
        community.setSlug("iut");
        community.setName("iUT");
        community.setVisibility(CommunityVisibility.PUBLIC);
        community.setCreatedByUid(FOUNDER);
        community.setMemberCount(1);
        return community;
    }

    private Community privateCommunity() {
        Community community = new Community();
        community.setId(1L);
        community.setSlug("iut-private");
        community.setName("iUT Private");
        community.setVisibility(CommunityVisibility.PRIVATE);
        community.setCreatedByUid(FOUNDER);
        community.setMemberCount(1);
        return community;
    }

    private CommunityMembership membershipOf(String uid, MembershipRole role, MembershipStatus status) {
        CommunityMembership membership = new CommunityMembership();
        membership.setCommunityId(1L);
        membership.setUserUid(uid);
        membership.setRole(role);
        membership.setStatus(status);
        return membership;
    }
}
