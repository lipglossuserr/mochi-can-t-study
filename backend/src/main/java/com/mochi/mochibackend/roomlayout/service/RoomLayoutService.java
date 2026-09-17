package com.mochi.mochibackend.roomlayout.service;

import com.mochi.mochibackend.exception.ItemAlreadyPlacedException;
import com.mochi.mochibackend.exception.ItemNotPlaceableException;
import com.mochi.mochibackend.exception.RoomLayoutEntryNotFoundException;
import com.mochi.mochibackend.inventory.entity.InventoryEntry;
import com.mochi.mochibackend.inventory.service.InventoryService;
import com.mochi.mochibackend.item.enums.ItemCategory;
import com.mochi.mochibackend.roomlayout.dto.CreateRoomLayoutRequest;
import com.mochi.mochibackend.roomlayout.dto.UpdateRoomLayoutRequest;
import com.mochi.mochibackend.roomlayout.entity.RoomLayoutEntry;
import com.mochi.mochibackend.roomlayout.repository.RoomLayoutRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Placement CRUD for owned items. Ownership is enforced the same way
 * {@code DailyGoalService}/{@code TaskService} enforce it: every
 * read/mutation on a specific layout entry goes through
 * {@link #requireOwnedEntry(String, Long)}, so another user's entry id
 * behaves as "not found" rather than "forbidden". Placing an item in
 * the first place additionally goes through {@code InventoryService}'s
 * own ownership check on the inventory entry — a user can't place an
 * item they don't own even if they guess a valid inventory entry id.
 * <p>
 * v1 deliberately has no grid-snapping and no collision detection (see
 * the plan) — {@code x}/{@code y} are stored and returned exactly as
 * the client sends them.
 */
@Service
public class RoomLayoutService {

    private static final int DEFAULT_Z_INDEX = 0;

    private final RoomLayoutRepository roomLayoutRepository;
    private final InventoryService inventoryService;

    public RoomLayoutService(RoomLayoutRepository roomLayoutRepository, InventoryService inventoryService) {
        this.roomLayoutRepository = roomLayoutRepository;
        this.inventoryService = inventoryService;
    }

    /**
     * First placement of an owned item: tray -> room. Fails if the
     * inventory entry isn't the caller's, or if it's already placed
     * (drag-to-reposition goes through {@link #update} instead).
     */
    @Transactional
    public RoomLayoutEntry create(String userId, CreateRoomLayoutRequest request) {
        InventoryEntry inventoryEntry = inventoryService.requireOwnedEntry(userId, request.getInventoryEntryId());

        ItemCategory category = inventoryEntry.getItem().getCategory();
        if (category == ItemCategory.FOOD || category == ItemCategory.SKIN) {
            throw new ItemNotPlaceableException(
                    "Items of category " + category + " cannot be placed in the room");
        }

        if (roomLayoutRepository.findByInventoryEntryId(inventoryEntry.getId()).isPresent()) {
            throw new ItemAlreadyPlacedException(
                    "Inventory entry " + inventoryEntry.getId() + " is already placed; use PATCH to reposition it");
        }

        RoomLayoutEntry entry = new RoomLayoutEntry();
        entry.setUserId(userId);
        entry.setInventoryEntry(inventoryEntry);
        entry.setX(request.getX());
        entry.setY(request.getY());
        entry.setZIndex(request.getZIndex() != null ? request.getZIndex() : DEFAULT_Z_INDEX);
        entry.setRotation(request.getRotation());

        return roomLayoutRepository.save(entry);
    }

    /**
     * Repositions an already-placed item. {@code zIndex}/{@code rotation}
     * are only overwritten when the request supplies them, so a plain
     * drag-to-reposition doesn't have to resend depth/rotation it isn't
     * changing.
     */
    @Transactional
    public RoomLayoutEntry update(String userId, Long entryId, UpdateRoomLayoutRequest request) {
        RoomLayoutEntry entry = requireOwnedEntry(userId, entryId);

        entry.setX(request.getX());
        entry.setY(request.getY());
        if (request.getZIndex() != null) {
            entry.setZIndex(request.getZIndex());
        }
        if (request.getRotation() != null) {
            entry.setRotation(request.getRotation());
        }

        return roomLayoutRepository.save(entry);
    }

    /** Un-places an item: room -> tray. Ownership stays intact (the {@code InventoryEntry} row is untouched). */
    @Transactional
    public void delete(String userId, Long entryId) {
        RoomLayoutEntry entry = requireOwnedEntry(userId, entryId);
        roomLayoutRepository.delete(entry);
    }

    @Transactional(readOnly = true)
    public List<RoomLayoutEntry> listForUser(String userId) {
        return roomLayoutRepository.findAllByUserId(userId);
    }

    private RoomLayoutEntry requireOwnedEntry(String userId, Long entryId) {
        return roomLayoutRepository.findByIdAndUserId(entryId, userId)
                .orElseThrow(() -> new RoomLayoutEntryNotFoundException("Room layout entry not found: " + entryId));
    }
}
