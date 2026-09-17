package com.mochi.mochibackend.pet.controller;

import com.mochi.mochibackend.dto.ApiResponse;
import com.mochi.mochibackend.exception.InvalidFirebaseTokenException;
import com.mochi.mochibackend.pet.dto.EquipSkinRequest;
import com.mochi.mochibackend.pet.dto.PetResponse;
import com.mochi.mochibackend.pet.dto.PublicPetBatchRequest;
import com.mochi.mochibackend.pet.dto.PublicPetSummaryResponse;
import com.mochi.mochibackend.pet.dto.SpendCoinsRequest;
import com.mochi.mochibackend.pet.mapper.PetMapper;
import com.mochi.mochibackend.pet.service.PetService;
import com.mochi.mochibackend.security.FirebaseAuthenticationToken;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The {@code /api/pet} contract. Controllers only translate HTTP <->
 * service calls; every rule (starter values, stat clamping) lives in
 * {@link PetService}. Entities are never exposed — every response goes
 * through {@link PetMapper}. The uid always comes from the verified
 * Firebase token in the security context, never from the client.
 */
@RestController
@RequestMapping("/api/pet")
public class PetController {

    private final PetService petService;
    private final PetMapper mapper;

    public PetController(PetService petService, PetMapper mapper) {
        this.petService = petService;
        this.mapper = mapper;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PetResponse>> getPet() {
        PetResponse response = mapper.toResponse(petService.getPet(currentUid()));
        return ResponseEntity.ok(ApiResponse.success("Pet retrieved", response));
    }

    @PostMapping("/feed")
    public ResponseEntity<ApiResponse<PetResponse>> feed() {
        PetResponse response = mapper.toResponse(petService.feedPet(currentUid()));
        return ResponseEntity.ok(ApiResponse.success("Pet fed", response));
    }

    @PostMapping("/play")
    public ResponseEntity<ApiResponse<PetResponse>> play() {
        PetResponse response = mapper.toResponse(petService.playWithPet(currentUid()));
        return ResponseEntity.ok(ApiResponse.success("Played with pet", response));
    }

    /**
     * The Shop's one backend touchpoint: deduct coins for a purchase.
     * The item catalog (names, prices, images) lives entirely on the
     * frontend — see {@link SpendCoinsRequest}'s doc comment — so this
     * endpoint just enforces "you can't spend more than you have" and
     * returns the pet with its updated balance.
     */
    @PostMapping("/coins/spend")
    public ResponseEntity<ApiResponse<PetResponse>> spendCoins(@Valid @RequestBody SpendCoinsRequest request) {
        PetResponse response = mapper.toResponse(petService.spendCoins(currentUid(), request.getAmount()));
        return ResponseEntity.ok(ApiResponse.success("Coins spent", response));
    }

    /**
     * Equips an owned SKIN item (Shop v1.1) — see {@link PetService#equipSkin}
     * for the ownership rule. PATCH (not POST) since this sets a
     * resource field to an idempotent value, unlike feed/play's
     * cumulative stat changes.
     */
    @PatchMapping("/skin")
    public ResponseEntity<ApiResponse<PetResponse>> equipSkin(@Valid @RequestBody EquipSkinRequest request) {
        PetResponse response = mapper.toResponse(petService.equipSkin(currentUid(), request.getItemKey()));
        return ResponseEntity.ok(ApiResponse.success("Skin equipped", response));
    }

    /**
     * Cosmetic-only batch lookup for presence tiles — Study Rooms Phase
     * 2. POST (not GET) because a uid list is a request body, not a
     * path/query concern, same reasoning as SpendCoinsRequest being a
     * body rather than a query param. A uid with no pet is silently
     * omitted from the response rather than erroring — see
     * {@link PetService#getPublicSummaries}.
     */
    @PostMapping("/public-batch")
    public ResponseEntity<ApiResponse<List<PublicPetSummaryResponse>>> publicBatch(
            @Valid @RequestBody PublicPetBatchRequest request) {
        List<PublicPetSummaryResponse> response = petService.getPublicSummaries(request.getUids()).stream()
                .map(mapper::toPublicSummary)
                .toList();
        return ResponseEntity.ok(ApiResponse.success("Public pet summaries retrieved", response));
    }

    /** Same pattern as StudySessionController: the uid comes from the verified Firebase token. */
    private String currentUid() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication instanceof FirebaseAuthenticationToken firebaseAuthenticationToken)) {
            throw new InvalidFirebaseTokenException("Invalid or missing Firebase token");
        }

        return firebaseAuthenticationToken.getUid();
    }
}