package com.mochi.mochibackend.community.controller;

import com.mochi.mochibackend.community.dto.ChangeMemberRoleRequest;
import com.mochi.mochibackend.community.dto.CommunityResponse;
import com.mochi.mochibackend.community.dto.CreateCommunityRequest;
import com.mochi.mochibackend.community.dto.MembershipResponse;
import com.mochi.mochibackend.community.dto.UpdateCommunityRequest;
import com.mochi.mochibackend.community.entity.Community;
import com.mochi.mochibackend.community.enums.MembershipStatus;
import com.mochi.mochibackend.community.mapper.CommunityMapper;
import com.mochi.mochibackend.community.service.CommunityService;
import com.mochi.mochibackend.dto.ApiResponse;
import com.mochi.mochibackend.exception.InvalidFirebaseTokenException;
import com.mochi.mochibackend.security.FirebaseAuthenticationToken;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

/**
 * The {@code /api/communities} contract — Community Rooms, Phase 1:
 * create/discover communities and manage membership. Posts, blogs, and
 * chat live under this same prefix in later phases.
 * <p>
 * Same shape as {@code TaskController}: controllers only translate HTTP
 * &lt;-&gt; service calls, every rule lives in {@link CommunityService},
 * entities never leave this layer un-mapped, and the uid always comes
 * from the verified Firebase token — never from the client.
 */
@RestController
@RequestMapping("/api/communities")
public class CommunityController {

    private final CommunityService communityService;
    private final CommunityMapper mapper;

    public CommunityController(CommunityService communityService, CommunityMapper mapper) {
        this.communityService = communityService;
        this.mapper = mapper;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CommunityResponse>> create(@Valid @RequestBody CreateCommunityRequest request) {
        String uid = currentUid();
        Community community = communityService.create(uid, request);
        CommunityResponse response = mapper.toResponse(community, communityService.findCallerMembership(uid, community.getId()));
        return ResponseEntity.ok(ApiResponse.success("Community created", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CommunityResponse>>> discover(
            @RequestParam(required = false) String search) {
        String uid = currentUid();
        List<CommunityResponse> communities = communityService.discover(uid, Optional.ofNullable(search)).stream()
                .map(c -> mapper.toResponse(c, communityService.findCallerMembership(uid, c.getId())))
                .toList();
        return ResponseEntity.ok(ApiResponse.success("Communities retrieved", communities));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<ApiResponse<CommunityResponse>> getBySlug(@PathVariable String slug) {
        String uid = currentUid();
        Community community = communityService.getBySlug(slug);
        CommunityResponse response = mapper.toResponse(community, communityService.findCallerMembership(uid, community.getId()));
        return ResponseEntity.ok(ApiResponse.success("Community retrieved", response));
    }

    /** Admin-only — see {@code CommunityService.update}'s javadoc for why this is stricter than the moderator-or-admin gate everything else here uses. */
    @PatchMapping("/{slug}")
    public ResponseEntity<ApiResponse<CommunityResponse>> update(
            @PathVariable String slug, @Valid @RequestBody UpdateCommunityRequest request) {
        String uid = currentUid();
        Community community = communityService.update(uid, slug, request);
        CommunityResponse response = mapper.toResponse(community, communityService.findCallerMembership(uid, community.getId()));
        return ResponseEntity.ok(ApiResponse.success("Community updated", response));
    }

    @PostMapping("/{slug}/join")
    public ResponseEntity<ApiResponse<MembershipResponse>> join(@PathVariable String slug) {
        MembershipResponse response = mapper.toResponse(communityService.join(currentUid(), slug));
        return ResponseEntity.ok(ApiResponse.success("Join request processed", response));
    }

    @PostMapping("/{slug}/leave")
    public ResponseEntity<ApiResponse<Void>> leave(@PathVariable String slug) {
        communityService.leave(currentUid(), slug);
        return ResponseEntity.ok(ApiResponse.success("Left community", null));
    }

    @GetMapping("/{slug}/members")
    public ResponseEntity<ApiResponse<List<MembershipResponse>>> listMembers(
            @PathVariable String slug,
            @RequestParam(required = false, defaultValue = "APPROVED") MembershipStatus status) {
        List<MembershipResponse> members = communityService.listMembers(currentUid(), slug, status).stream()
                .map(mapper::toResponse)
                .toList();
        return ResponseEntity.ok(ApiResponse.success("Members retrieved", members));
    }

    @PostMapping("/{slug}/members/{targetUid}/approve")
    public ResponseEntity<ApiResponse<MembershipResponse>> approve(
            @PathVariable String slug, @PathVariable String targetUid) {
        MembershipResponse response = mapper.toResponse(communityService.approve(currentUid(), slug, targetUid));
        return ResponseEntity.ok(ApiResponse.success("Member approved", response));
    }

    @PostMapping("/{slug}/members/{targetUid}/reject")
    public ResponseEntity<ApiResponse<MembershipResponse>> reject(
            @PathVariable String slug, @PathVariable String targetUid) {
        MembershipResponse response = mapper.toResponse(communityService.reject(currentUid(), slug, targetUid));
        return ResponseEntity.ok(ApiResponse.success("Join request rejected", response));
    }

    /** Admin-only — see {@code CommunityService.changeRole}'s javadoc for why this is stricter than the moderator-or-admin gate everything else here uses. */
    @PostMapping("/{slug}/members/{targetUid}/role")
    public ResponseEntity<ApiResponse<MembershipResponse>> changeRole(
            @PathVariable String slug, @PathVariable String targetUid, @Valid @RequestBody ChangeMemberRoleRequest request) {
        MembershipResponse response = mapper.toResponse(
                communityService.changeRole(currentUid(), slug, targetUid, request.getRole()));
        return ResponseEntity.ok(ApiResponse.success("Member role updated", response));
    }

    /**
     * Direct ban, outside the Phase 5 report flow — for when a
     * moderator/admin has already seen enough (e.g. across several
     * posts) and doesn't need to file a report against their own
     * community first. {@code ReportService.banAuthor} calls the same
     * {@code CommunityService.ban} underneath.
     */
    @PostMapping("/{slug}/members/{targetUid}/ban")
    public ResponseEntity<ApiResponse<MembershipResponse>> ban(
            @PathVariable String slug, @PathVariable String targetUid) {
        MembershipResponse response = mapper.toResponse(communityService.ban(currentUid(), slug, targetUid));
        return ResponseEntity.ok(ApiResponse.success("Member banned", response));
    }

    /** Same pattern as TaskController/StudySessionController/PetController: the uid comes from the verified Firebase token. */
    private String currentUid() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication instanceof FirebaseAuthenticationToken firebaseAuthenticationToken)) {
            throw new InvalidFirebaseTokenException("Invalid or missing Firebase token");
        }

        return firebaseAuthenticationToken.getUid();
    }
}
