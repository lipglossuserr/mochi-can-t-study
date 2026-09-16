package com.mochi.mochibackend.pet.controller;

import com.mochi.mochibackend.dto.ApiResponse;
import com.mochi.mochibackend.exception.InvalidFirebaseTokenException;
import com.mochi.mochibackend.pet.dto.PetResponse;
import com.mochi.mochibackend.pet.dto.SpendCoinsRequest;
import com.mochi.mochibackend.pet.mapper.PetMapper;
import com.mochi.mochibackend.pet.service.PetService;
import com.mochi.mochibackend.security.FirebaseAuthenticationToken;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

    /** Same pattern as StudySessionController: the uid comes from the verified Firebase token. */
    private String currentUid() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication instanceof FirebaseAuthenticationToken firebaseAuthenticationToken)) {
            throw new InvalidFirebaseTokenException("Invalid or missing Firebase token");
        }

        return firebaseAuthenticationToken.getUid();
    }
}