package com.mochi.mochibackend.roomlayout.controller;

import com.mochi.mochibackend.dto.ApiResponse;
import com.mochi.mochibackend.exception.InvalidFirebaseTokenException;
import com.mochi.mochibackend.roomlayout.dto.CreateRoomLayoutRequest;
import com.mochi.mochibackend.roomlayout.dto.RoomLayoutResponse;
import com.mochi.mochibackend.roomlayout.dto.UpdateRoomLayoutRequest;
import com.mochi.mochibackend.roomlayout.mapper.RoomLayoutMapper;
import com.mochi.mochibackend.roomlayout.service.RoomLayoutService;
import com.mochi.mochibackend.security.FirebaseAuthenticationToken;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The {@code /api/room-layout} contract: where a user's owned furniture/
 * toys/decorations currently sit in the room. Controllers only
 * translate HTTP <-> service calls; every rule (ownership, "already
 * placed") lives in {@link RoomLayoutService}. Entities are never
 * exposed — every response goes through {@link RoomLayoutMapper}. The
 * uid always comes from the verified Firebase token, never the client.
 */
@RestController
@RequestMapping("/api/room-layout")
public class RoomLayoutController {

    private final RoomLayoutService roomLayoutService;
    private final RoomLayoutMapper mapper;

    public RoomLayoutController(RoomLayoutService roomLayoutService, RoomLayoutMapper mapper) {
        this.roomLayoutService = roomLayoutService;
        this.mapper = mapper;
    }

    /** Drag from the inventory tray onto the room floor/wall for the first time. */
    @PostMapping
    public ResponseEntity<ApiResponse<RoomLayoutResponse>> create(@Valid @RequestBody CreateRoomLayoutRequest request) {
        RoomLayoutResponse response = mapper.toResponse(roomLayoutService.create(currentUid(), request));
        return ResponseEntity.ok(ApiResponse.success("Item placed", response));
    }

    /** Everything currently placed in the caller's room, for {@code PlacedFurnitureLayer} to render. */
    @GetMapping
    public ResponseEntity<ApiResponse<List<RoomLayoutResponse>>> list() {
        List<RoomLayoutResponse> entries = roomLayoutService.listForUser(currentUid())
                .stream()
                .map(mapper::toResponse)
                .toList();
        return ResponseEntity.ok(ApiResponse.success("Room layout retrieved", entries));
    }

    /** Drag an already-placed item to a new spot. Called once per drag gesture (debounced client-side), not per pixel. */
    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<RoomLayoutResponse>> update(
            @PathVariable Long id, @Valid @RequestBody UpdateRoomLayoutRequest request) {
        RoomLayoutResponse response = mapper.toResponse(roomLayoutService.update(currentUid(), id, request));
        return ResponseEntity.ok(ApiResponse.success("Room layout updated", response));
    }

    /** Drag an item off the room and back into the tray. Ownership is untouched — only the placement is removed. */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        roomLayoutService.delete(currentUid(), id);
        return ResponseEntity.ok(ApiResponse.success("Item unplaced", null));
    }

    /** Same pattern as PetController/DailyGoalController: the uid comes from the verified Firebase token. */
    private String currentUid() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication instanceof FirebaseAuthenticationToken firebaseAuthenticationToken)) {
            throw new InvalidFirebaseTokenException("Invalid or missing Firebase token");
        }

        return firebaseAuthenticationToken.getUid();
    }
}
