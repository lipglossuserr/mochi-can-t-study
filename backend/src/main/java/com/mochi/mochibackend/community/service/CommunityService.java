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
import com.mochi.mochibackend.exception.CommunityNotFoundException;
import com.mochi.mochibackend.exception.CommunitySlugAlreadyExistsException;
import com.mochi.mochibackend.exception.InsufficientCommunityRoleException;
import com.mochi.mochibackend.exception.LastAdminCannotBeDemotedException;
import com.mochi.mochibackend.exception.MembershipRequestNotFoundException;
import com.mochi.mochibackend.exception.NotCommunityMemberException;
import com.mochi.mochibackend.exception.SoleAdminCannotLeaveException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Clock;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Community Rooms, Phase 1: create/discover communities and manage
 * membership (join, leave, approve, reject, ban, changeRole). Posts,
 * blogs, and moderation are later phases and deliberately out of scope
 * here.
 * <p>
 * Ownership/authorization follows the same shape as every other service
 * in this codebase ({@code TaskService.requireOwnedTask},
 * {@code StudySessionService}): every mutation resolves the caller's
 * standing (membership row, role) before acting, and "you don't have
 * standing to do this" is modeled as a specific exception rather than a
 * generic 403, so {@code GlobalExceptionHandler} can give a precise
 * message.
 * <p>
 * As of Phase 6 (chat), every membership-mutating method also syncs
 * {@code CommunityMemberMirrorRepository} — the Firestore mirror that
 * Security Rules check to authorize chat reads/writes without a round
 * trip to Spring. This sync is best-effort and happens after the MySQL
 * write, not inside the same distributed transaction (there isn't one
 * — Firestore and MySQL don't share a transaction manager), so a
 * Firestore hiccup between the two writes is a real, if narrow, drift
 * window. The design doc flags this exact risk as the highest-priority
 * tech debt in the whole feature; {@code CommunityServiceTest}'s sync
 * assertions are the closest thing to the "integration test that
 * asserts they never diverge" it calls for, short of standing up a real
 * Firestore emulator in this environment — see this class's test file
 * for what that leaves uncovered.
 */
@Service
public class CommunityService {

    private final CommunityRepository communityRepository;
    private final CommunityMembershipRepository membershipRepository;
    private final CommunityMemberMirrorRepository mirrorRepository;
    private final Clock clock;

    public CommunityService(
            CommunityRepository communityRepository,
            CommunityMembershipRepository membershipRepository,
            CommunityMemberMirrorRepository mirrorRepository,
            Clock clock) {
        this.communityRepository = communityRepository;
        this.membershipRepository = membershipRepository;
        this.mirrorRepository = mirrorRepository;
        this.clock = clock;
    }

    /**
     * Any authenticated user may create a community; the creator is
     * immediately granted an APPROVED ADMIN membership. This is the
     * "any user can create, per-community roles" policy chosen in the
     * Community Rooms design doc — there is no platform-wide admin
     * gate on creation.
     */
    @Transactional
    public Community create(String userUid, CreateCommunityRequest request) {
        String slug = StringUtils.hasText(request.getSlug())
                ? requireUniqueSlug(request.getSlug())
                : generateUniqueSlug(request.getName());

        Community community = new Community();
        community.setSlug(slug);
        community.setName(request.getName());
        community.setDescription(request.getDescription());
        community.setVisibility(request.getVisibility() != null ? request.getVisibility() : CommunityVisibility.PUBLIC);
        community.setIconUrl(request.getIconUrl());
        community.setCreatedByUid(userUid);
        community.setMemberCount(1);

        Community saved = communityRepository.save(community);

        CommunityMembership founderMembership = new CommunityMembership();
        founderMembership.setCommunityId(saved.getId());
        founderMembership.setUserUid(userUid);
        founderMembership.setRole(MembershipRole.ADMIN);
        founderMembership.setStatus(MembershipStatus.APPROVED);
        founderMembership.setDecidedAt(clock.instant());
        founderMembership.setDecidedByUid(userUid);
        membershipRepository.save(founderMembership);
        mirrorRepository.upsert(saved.getId(), userUid, MembershipRole.ADMIN.name(), MembershipStatus.APPROVED.name());

        return saved;
    }

    /**
     * The discover feed: every PUBLIC community, plus every PRIVATE
     * community the caller has any relationship with (pending, approved,
     * or rejected) — so a rejected or awaiting request doesn't vanish
     * from view. Optional {@code search} does a simple case-insensitive
     * name match; fine at the community counts this feature expects
     * (see the design doc's non-functional requirements).
     */
    @Transactional(readOnly = true)
    public List<Community> discover(String userUid, Optional<String> search) {
        Map<Long, Community> results = new LinkedHashMap<>();

        communityRepository.findAllByVisibilityOrderByMemberCountDescNameAsc(CommunityVisibility.PUBLIC)
                .forEach(c -> results.put(c.getId(), c));

        List<Long> privateCommunityIdsForCaller = membershipRepository.findAllByUserUid(userUid).stream()
                .map(CommunityMembership::getCommunityId)
                .toList();

        for (Long communityId : privateCommunityIdsForCaller) {
            if (!results.containsKey(communityId)) {
                communityRepository.findById(communityId).ifPresent(c -> results.put(c.getId(), c));
            }
        }

        return search
                .filter(StringUtils::hasText)
                .map(term -> results.values().stream()
                        .filter(c -> c.getName().toLowerCase(Locale.ROOT).contains(term.toLowerCase(Locale.ROOT)))
                        .sorted(Comparator.comparing(Community::getName))
                        .collect(Collectors.toList()))
                .orElseGet(() -> results.values().stream()
                        .sorted(Comparator.comparingInt(Community::getMemberCount).reversed())
                        .collect(Collectors.toList()));
    }

    @Transactional(readOnly = true)
    public Community getBySlug(String slug) {
        return requireCommunity(slug);
    }

    /** Returns the caller's membership row for a community, if any. Used to build CommunityResponse.callerRole/callerStatus. */
    @Transactional(readOnly = true)
    public Optional<CommunityMembership> findCallerMembership(String userUid, Long communityId) {
        return membershipRepository.findByCommunityIdAndUserUid(communityId, userUid);
    }

    /**
     * PUBLIC communities: instant APPROVED membership. PRIVATE: PENDING,
     * awaiting a moderator/admin. Idempotent for an existing PENDING or
     * APPROVED row (returns it unchanged); a previously REJECTED row is
     * revived back into a fresh request rather than blocked forever, so
     * a rejection isn't permanent by accident.
     */
    @Transactional
    public CommunityMembership join(String userUid, String slug) {
        Community community = requireCommunity(slug);

        Optional<CommunityMembership> existing = membershipRepository.findByCommunityIdAndUserUid(community.getId(), userUid);
        if (existing.isPresent() && existing.get().getStatus() == MembershipStatus.BANNED) {
            throw new BannedFromCommunityException("You've been banned from this community");
        }
        if (existing.isPresent() && existing.get().getStatus() != MembershipStatus.REJECTED) {
            return existing.get();
        }

        CommunityMembership membership = existing.orElseGet(() -> {
            CommunityMembership m = new CommunityMembership();
            m.setCommunityId(community.getId());
            m.setUserUid(userUid);
            m.setRole(MembershipRole.MEMBER);
            return m;
        });

        boolean instantApproval = community.getVisibility() == CommunityVisibility.PUBLIC;
        membership.setStatus(instantApproval ? MembershipStatus.APPROVED : MembershipStatus.PENDING);
        membership.setDecidedAt(instantApproval ? clock.instant() : null);
        membership.setDecidedByUid(instantApproval ? userUid : null);

        CommunityMembership saved = membershipRepository.save(membership);
        mirrorRepository.upsert(community.getId(), userUid, saved.getRole().name(), saved.getStatus().name());

        if (instantApproval) {
            adjustMemberCount(community, 1);
        }

        return saved;
    }

    /**
     * Only an APPROVED member can leave. The sole remaining ADMIN is
     * blocked from leaving (see {@link SoleAdminCannotLeaveException})
     * to avoid orphaning a community nobody can moderate — they'd need
     * to promote a successor first, which is a Phase 1 follow-up.
     */
    @Transactional
    public void leave(String userUid, String slug) {
        Community community = requireCommunity(slug);
        CommunityMembership membership = membershipRepository.findByCommunityIdAndUserUid(community.getId(), userUid)
                .filter(m -> m.getStatus() == MembershipStatus.APPROVED)
                .orElseThrow(() -> new NotCommunityMemberException("You are not a member of this community"));

        if (membership.getRole() == MembershipRole.ADMIN) {
            long approvedAdmins = membershipRepository.countByCommunityIdAndRoleAndStatus(
                    community.getId(), MembershipRole.ADMIN, MembershipStatus.APPROVED);
            if (approvedAdmins <= 1) {
                throw new SoleAdminCannotLeaveException(
                        "You're the only admin of this community — promote another member to admin before leaving");
            }
        }

        membershipRepository.delete(membership);
        mirrorRepository.delete(community.getId(), userUid);
        adjustMemberCount(community, -1);
    }

    /**
     * APPROVED members only, matching {@code leave} — you have to belong
     * to see who else belongs. {@code statusFilter} of PENDING further
     * requires MODERATOR/ADMIN standing, since the pending queue is a
     * moderation tool, not public information.
     */
    @Transactional(readOnly = true)
    public List<CommunityMembership> listMembers(String userUid, String slug, MembershipStatus statusFilter) {
        Community community = requireCommunity(slug);
        CommunityMembership caller = requireApprovedMembership(community, userUid);

        if (statusFilter == MembershipStatus.PENDING) {
            requireModeratorOrAdmin(caller);
        }

        return membershipRepository.findAllByCommunityIdAndStatusOrderByCreatedAtAsc(community.getId(), statusFilter);
    }

    @Transactional
    public CommunityMembership approve(String userUid, String slug, String targetUid) {
        return decide(userUid, slug, targetUid, MembershipStatus.APPROVED);
    }

    @Transactional
    public CommunityMembership reject(String userUid, String slug, String targetUid) {
        return decide(userUid, slug, targetUid, MembershipStatus.REJECTED);
    }

    /**
     * Admin-only: edit a community's name/description/icon after
     * creation — v2 backlog, closing the gap that a community's icon
     * (and name/description) could only ever be set once, at creation
     * time, with no way to revisit it. Deliberately as strict as
     * {@code changeRole} (caller must already be ADMIN, not just
     * MODERATOR-or-admin) — editing the community's own identity is a
     * governance action, not routine moderation. Every field is
     * optional; an omitted field is left unchanged. {@code iconUrl}
     * accepts {@code null} explicitly to mean "remove the icon" — see
     * {@code UpdateCommunityRequest}'s javadoc for why {@code visibility}
     * and {@code slug} aren't editable here.
     */
    @Transactional
    public Community update(String userUid, String slug, UpdateCommunityRequest request) {
        Community community = requireCommunity(slug);
        CommunityMembership caller = requireApprovedMembership(community, userUid);
        if (caller.getRole() != MembershipRole.ADMIN) {
            throw new InsufficientCommunityRoleException("Only an admin can edit this community");
        }

        if (StringUtils.hasText(request.getName())) {
            community.setName(request.getName());
        }
        if (request.getDescription() != null) {
            community.setDescription(request.getDescription().isBlank() ? null : request.getDescription());
        }
        if (request.getIconUrl() != null) {
            community.setIconUrl(request.getIconUrl().isBlank() ? null : request.getIconUrl());
        }

        return communityRepository.save(community);
    }

    /**
     * Admin-only: promote or demote another APPROVED member's role.
     * Deliberately stricter than {@code requireModeratorOrAdmin} (which
     * the approve/reject/ban actions use) — a moderator granting
     * themselves ADMIN would be a privilege escalation, so role changes
     * require the caller to already be an ADMIN. Refuses to demote the
     * sole remaining ADMIN (mirrors {@code leave}'s sole-admin guard),
     * so a community can't be talked into a state nobody can govern.
     * This is what unblocks {@code ban} on a member who's currently an
     * ADMIN: demote them here first, then ban.
     */
    @Transactional
    public CommunityMembership changeRole(String userUid, String slug, String targetUid, MembershipRole newRole) {
        Community community = requireCommunity(slug);
        CommunityMembership caller = requireApprovedMembership(community, userUid);
        if (caller.getRole() != MembershipRole.ADMIN) {
            throw new InsufficientCommunityRoleException("Only an admin can change member roles");
        }

        CommunityMembership target = membershipRepository.findByCommunityIdAndUserUid(community.getId(), targetUid)
                .filter(m -> m.getStatus() == MembershipStatus.APPROVED)
                .orElseThrow(() -> new NotCommunityMemberException("That user isn't an approved member of this community"));

        if (target.getRole() == MembershipRole.ADMIN && newRole != MembershipRole.ADMIN) {
            long approvedAdmins = membershipRepository.countByCommunityIdAndRoleAndStatus(
                    community.getId(), MembershipRole.ADMIN, MembershipStatus.APPROVED);
            if (approvedAdmins <= 1) {
                throw new LastAdminCannotBeDemotedException(
                        "Promote another member to admin before demoting the only admin");
            }
        }

        target.setRole(newRole);
        CommunityMembership saved = membershipRepository.save(target);
        mirrorRepository.upsert(community.getId(), targetUid, saved.getRole().name(), saved.getStatus().name());
        return saved;
    }

    /**
     * Public on purpose: {@code ReportService}'s "Ban" moderation action
     * (Phase 5) calls this after resolving a report rather than
     * duplicating membership-mutation logic; also exposed directly via
     * {@code CommunityController} for a moderator acting outside the
     * report flow. Refuses to ban an ADMIN — removing a fellow admin is
     * a governance decision this flow isn't meant to make on its own;
     * call {@link #changeRole} to demote them first. Idempotent-ish:
     * banning an already-BANNED member is a no-op that returns the row
     * unchanged.
     */
    @Transactional
    public CommunityMembership ban(String userUid, String slug, String targetUid) {
        Community community = requireCommunity(slug);
        CommunityMembership caller = requireApprovedMembership(community, userUid);
        requireModeratorOrAdmin(caller);

        CommunityMembership target = membershipRepository.findByCommunityIdAndUserUid(community.getId(), targetUid)
                .orElseThrow(() -> new NotCommunityMemberException("That user isn't a member of this community"));

        if (target.getStatus() == MembershipStatus.BANNED) {
            return target;
        }
        if (target.getRole() == MembershipRole.ADMIN) {
            throw new InsufficientCommunityRoleException("Admins can't be banned through this flow");
        }

        boolean wasApproved = target.getStatus() == MembershipStatus.APPROVED;
        target.setStatus(MembershipStatus.BANNED);
        target.setDecidedAt(clock.instant());
        target.setDecidedByUid(userUid);
        CommunityMembership saved = membershipRepository.save(target);
        mirrorRepository.upsert(community.getId(), targetUid, saved.getRole().name(), saved.getStatus().name());

        if (wasApproved) {
            adjustMemberCount(community, -1);
        }

        return saved;
    }

    // ------------------------------------------------------------------

    private CommunityMembership decide(String userUid, String slug, String targetUid, MembershipStatus decision) {
        Community community = requireCommunity(slug);
        CommunityMembership caller = requireApprovedMembership(community, userUid);
        requireModeratorOrAdmin(caller);

        CommunityMembership target = membershipRepository.findByCommunityIdAndUserUid(community.getId(), targetUid)
                .filter(m -> m.getStatus() == MembershipStatus.PENDING)
                .orElseThrow(() -> new MembershipRequestNotFoundException("No pending join request for that user"));

        target.setStatus(decision);
        target.setDecidedAt(clock.instant());
        target.setDecidedByUid(userUid);
        CommunityMembership saved = membershipRepository.save(target);
        mirrorRepository.upsert(community.getId(), targetUid, saved.getRole().name(), saved.getStatus().name());

        if (decision == MembershipStatus.APPROVED) {
            adjustMemberCount(community, 1);
        }

        return saved;
    }

    /**
     * Public on purpose: {@code PostService} (Phase 2) and every later
     * phase that gates an action on "is this caller actually in the
     * room" reuse this rather than re-deriving membership standing
     * themselves — one place decides what "a member" means.
     */
    public CommunityMembership requireApprovedMembership(Community community, String userUid) {
        return membershipRepository.findByCommunityIdAndUserUid(community.getId(), userUid)
                .filter(m -> m.getStatus() == MembershipStatus.APPROVED)
                .orElseThrow(() -> new NotCommunityMemberException("You are not a member of this community"));
    }

    /** Public alongside {@link #requireApprovedMembership}, same reuse reasoning. */
    public void requireModeratorOrAdmin(CommunityMembership membership) {
        if (membership.getRole() != MembershipRole.MODERATOR && membership.getRole() != MembershipRole.ADMIN) {
            throw new InsufficientCommunityRoleException("Only moderators and admins can do this");
        }
    }

    private Community requireCommunity(String slug) {
        return communityRepository.findBySlug(slug)
                .orElseThrow(() -> new CommunityNotFoundException("Community not found"));
    }

    private void adjustMemberCount(Community community, int delta) {
        community.setMemberCount(Math.max(0, community.getMemberCount() + delta));
        communityRepository.save(community);
    }

    private String requireUniqueSlug(String candidate) {
        String normalized = candidate.toLowerCase(Locale.ROOT);
        if (communityRepository.existsBySlug(normalized)) {
            throw new CommunitySlugAlreadyExistsException("That slug is already taken: " + normalized);
        }
        return normalized;
    }

    /** Derives a URL-safe slug from a display name, appending -2, -3, ... on collision. */
    private String generateUniqueSlug(String name) {
        String base = name.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+)|(-+$)", "");
        if (!StringUtils.hasText(base)) {
            base = "community";
        }
        if (base.length() > 60) {
            base = base.substring(0, 60);
        }

        String candidate = base;
        int suffix = 2;
        while (communityRepository.existsBySlug(candidate)) {
            candidate = base + "-" + suffix;
            suffix++;
        }
        return candidate;
    }
}
