package com.mochi.mochibackend.inventory.controller;

import com.mochi.mochibackend.dto.ApiResponse;
import com.mochi.mochibackend.exception.InvalidFirebaseTokenException;
import com.mochi.mochibackend.inventory.dto.InventoryEntryResponse;
import com.mochi.mochibackend.inventory.entity.InventoryEntry;
import com.mochi.mochibackend.inventory.mapper.InventoryMapper;
import com.mochi.mochibackend.inventory.service.InventoryService;
import com.mochi.mochibackend.pet.dto.PetResponse;
import com.mochi.mochibackend.pet.entity.Pet;
import com.mochi.mochibackend.pet.mapper.PetMapper;
import com.mochi.mochibackend.security.FirebaseAuthenticationToken;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The {@code /api/inventory} contract: everything a user owns, whether
 * placed in the room, still sitting in the tray, or (FOOD only) waiting
 * to be dropped on Mochi. New rows are still only ever created by
 * {@code POST /api/shop/purchase} (see {@code ShopController}) — this
 * controller only reads and — for FOOD — consumes.
 */
@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService inventoryService;
    private final InventoryMapper mapper;
    private final PetMapper petMapper;

    public InventoryController(InventoryService inventoryService, InventoryMapper mapper, PetMapper petMapper) {
        this.inventoryService = inventoryService;
        this.mapper = mapper;
        this.petMapper = petMapper;
    }

    /** Every item the caller owns, each flagged with whether (and where) it's currently placed. */
    @GetMapping
    public ResponseEntity<ApiResponse<List<InventoryEntryResponse>>> list() {
        String uid = currentUid();
        List<InventoryEntryResponse> entries = inventoryService.listForUser(uid)
                .stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(ApiResponse.success("Inventory retrieved", entries));
    }

    /**
     * Drop a purchased FOOD item onto Mochi: atomic ownership check +
     * feed + inventory removal (see InventoryService#consumeFood).
     * Returns the pet with its updated hunger/mood so the caller can
     * refresh stats from this one response, same "everything the UI
     * needs from one call" convenience PurchaseResponse already gives
     * the Shop.
     */
    @PostMapping("/{id}/consume")
    public ResponseEntity<ApiResponse<PetResponse>> consume(@PathVariable Long id) {
        Pet pet = inventoryService.consumeFood(currentUid(), id);
        return ResponseEntity.ok(ApiResponse.success("Mochi was fed", petMapper.toResponse(pet)));
    }

    private InventoryEntryResponse toResponse(InventoryEntry entry) {
        Long placementId = inventoryService.placementIdFor(entry.getId());
        return mapper.toResponse(entry, placementId);
    }

    /** Same pattern as PetController/RoomLayoutController: the uid comes from the verified Firebase token. */
    private String currentUid() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication instanceof FirebaseAuthenticationToken firebaseAuthenticationToken)) {
            throw new InvalidFirebaseTokenException("Invalid or missing Firebase token");
        }

        return firebaseAuthenticationToken.getUid();
    }
}
