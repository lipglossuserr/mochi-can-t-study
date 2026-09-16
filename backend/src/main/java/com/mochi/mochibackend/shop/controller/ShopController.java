package com.mochi.mochibackend.shop.controller;

import com.mochi.mochibackend.dto.ApiResponse;
import com.mochi.mochibackend.exception.InvalidFirebaseTokenException;
import com.mochi.mochibackend.inventory.mapper.InventoryMapper;
import com.mochi.mochibackend.item.dto.ItemResponse;
import com.mochi.mochibackend.item.mapper.ItemMapper;
import com.mochi.mochibackend.item.service.ItemService;
import com.mochi.mochibackend.pet.mapper.PetMapper;
import com.mochi.mochibackend.security.FirebaseAuthenticationToken;
import com.mochi.mochibackend.shop.dto.PurchaseRequest;
import com.mochi.mochibackend.shop.dto.PurchaseResponse;
import com.mochi.mochibackend.shop.service.ShopService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The {@code /api/shop} contract for furniture/toys/decorations. Food
 * keeps using {@code /api/pet/coins/spend} exactly as before (see
 * {@code SpendCoinsRequest}'s doc comment) — this controller is only
 * for items that get owned via {@link com.mochi.mochibackend.inventory.entity.InventoryEntry}
 * instead of consumed immediately. Controllers only translate HTTP <->
 * service calls; every rule (affordability, atomicity) lives in
 * {@link ShopService}. Entities are never exposed — every response goes
 * through a mapper. The uid always comes from the verified Firebase
 * token, never the client.
 */
@RestController
@RequestMapping("/api/shop")
public class ShopController {

    private final ItemService itemService;
    private final ShopService shopService;
    private final ItemMapper itemMapper;
    private final InventoryMapper inventoryMapper;
    private final PetMapper petMapper;

    public ShopController(
            ItemService itemService,
            ShopService shopService,
            ItemMapper itemMapper,
            InventoryMapper inventoryMapper,
            PetMapper petMapper
    ) {
        this.itemService = itemService;
        this.shopService = shopService;
        this.itemMapper = itemMapper;
        this.inventoryMapper = inventoryMapper;
        this.petMapper = petMapper;
    }

    /** The furniture/toy/decoration catalog. Same for every user — no per-user pricing or availability in v1. */
    @GetMapping("/items")
    public ResponseEntity<ApiResponse<List<ItemResponse>>> listItems() {
        List<ItemResponse> items = itemService.listActive().stream().map(itemMapper::toResponse).toList();
        return ResponseEntity.ok(ApiResponse.success("Shop items retrieved", items));
    }

    /**
     * Buys one instance of {@code itemId}: atomic afford-check + coin
     * deduct + grant inventory row (see {@link ShopService#purchase}).
     * The new item lands in the inventory tray, unplaced — placing it
     * in the room is a separate {@code POST /api/room-layout} call.
     */
    @PostMapping("/purchase")
    public ResponseEntity<ApiResponse<PurchaseResponse>> purchase(@Valid @RequestBody PurchaseRequest request) {
        ShopService.Purchase purchase = shopService.purchase(currentUid(), request.getItemId());

        PurchaseResponse response = new PurchaseResponse(
                inventoryMapper.toResponse(purchase.inventoryEntry(), null),
                petMapper.toResponse(purchase.pet())
        );

        return ResponseEntity.ok(ApiResponse.success("Item purchased", response));
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
