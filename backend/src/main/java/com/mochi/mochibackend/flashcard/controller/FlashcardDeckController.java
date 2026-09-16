package com.mochi.mochibackend.flashcard.controller;

import com.mochi.mochibackend.dto.ApiResponse;
import com.mochi.mochibackend.exception.InvalidFirebaseTokenException;
import com.mochi.mochibackend.flashcard.dto.FlashcardDeckDetailResponse;
import com.mochi.mochibackend.flashcard.dto.FlashcardDeckSummaryResponse;
import com.mochi.mochibackend.flashcard.enums.DeckMode;
import com.mochi.mochibackend.flashcard.enums.Difficulty;
import com.mochi.mochibackend.flashcard.enums.Focus;
import com.mochi.mochibackend.flashcard.service.FlashcardDeckService;
import com.mochi.mochibackend.pet.dto.PetResponse;
import com.mochi.mochibackend.pet.entity.Pet;
import com.mochi.mochibackend.pet.mapper.PetMapper;
import com.mochi.mochibackend.security.FirebaseAuthenticationToken;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/** The /api/flashcard-decks contract: upload+generate, list, view, delete, and complete (reward) a deck. */
@RestController
@RequestMapping("/api/flashcard-decks")
public class FlashcardDeckController {

    private final FlashcardDeckService service;
    private final PetMapper petMapper;

    public FlashcardDeckController(FlashcardDeckService service, PetMapper petMapper) {
        this.service = service;
        this.petMapper = petMapper;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<FlashcardDeckDetailResponse>> generate(
            @RequestParam("file") MultipartFile file,
            @RequestParam("mode") DeckMode mode,
            @RequestParam(value = "difficulty", defaultValue = "MEDIUM") Difficulty difficulty,
            @RequestParam(value = "focus", defaultValue = "ENTIRE_DOCUMENT") Focus focus,
            @RequestParam(value = "cardCount", defaultValue = "10") int cardCount
    ) {
        FlashcardDeckDetailResponse response = service.generate(currentUid(), file, mode, difficulty, focus, cardCount);
        return ResponseEntity.ok(ApiResponse.success("Study deck generated", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<FlashcardDeckSummaryResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.success("Decks retrieved", service.listForUser(currentUid())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<FlashcardDeckDetailResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Deck retrieved", service.getOwned(currentUid(), id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        service.delete(currentUid(), id);
        return ResponseEntity.ok(ApiResponse.success("Deck deleted", null));
    }

    /** "Complete Deck" on the last card — atomic XP/coins/mood reward, same idempotency as Task completion. */
    @PostMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<PetResponse>> complete(@PathVariable Long id) {
        Pet pet = service.complete(currentUid(), id);
        return ResponseEntity.ok(ApiResponse.success("Deck completed", petMapper.toResponse(pet)));
    }

    private String currentUid() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication instanceof FirebaseAuthenticationToken firebaseAuthenticationToken)) {
            throw new InvalidFirebaseTokenException("Invalid or missing Firebase token");
        }
        return firebaseAuthenticationToken.getUid();
    }
}