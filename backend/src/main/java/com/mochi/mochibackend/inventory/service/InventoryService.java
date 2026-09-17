package com.mochi.mochibackend.inventory.service;

import com.mochi.mochibackend.exception.InventoryEntryNotFoundException;
import com.mochi.mochibackend.exception.InventoryItemNotFoodException;
import com.mochi.mochibackend.inventory.entity.InventoryEntry;
import com.mochi.mochibackend.inventory.repository.InventoryEntryRepository;
import com.mochi.mochibackend.item.enums.ItemCategory;
import com.mochi.mochibackend.pet.entity.Pet;
import com.mochi.mochibackend.pet.service.PetService;
import com.mochi.mochibackend.roomlayout.repository.RoomLayoutRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Read access to what a user owns, plus the ownership-safe lookup
 * {@code RoomLayoutService} uses when placing/re-placing an item (an
 * inventory entry id belonging to another user behaves as "not found",
 * same pattern as {@code DailyGoalService.requireOwnedGoal}), plus the
 * FOOD-only "consume" action (see consumeFood below). Granting new
 * inventory rows is {@code ShopService}'s job, not this class's — see
 * its doc comment for why purchase logic lives with the Shop instead
 * of here.
 */
@Service
public class InventoryService {

    private final InventoryEntryRepository inventoryEntryRepository;
    private final RoomLayoutRepository roomLayoutRepository;
    private final PetService petService;

    public InventoryService(
            InventoryEntryRepository inventoryEntryRepository,
            RoomLayoutRepository roomLayoutRepository,
            PetService petService
    ) {
        this.inventoryEntryRepository = inventoryEntryRepository;
        this.roomLayoutRepository = roomLayoutRepository;
        this.petService = petService;
    }

    @Transactional(readOnly = true)
    public List<InventoryEntry> listForUser(String userId) {
        return inventoryEntryRepository.findAllByUserIdOrderByAcquiredAtDesc(userId);
    }

    /** The id of the {@code RoomLayoutEntry} placing this inventory entry, or {@code null} if it's still in the tray. */
    @Transactional(readOnly = true)
    public Long placementIdFor(Long inventoryEntryId) {
        return roomLayoutRepository.findByInventoryEntryId(inventoryEntryId)
                .map(entry -> entry.getId())
                .orElse(null);
    }

    /** Ownership-safe lookup used by {@code RoomLayoutService} before placing/re-placing an item. */
    @Transactional(readOnly = true)
    public InventoryEntry requireOwnedEntry(String userId, Long inventoryEntryId) {
        return inventoryEntryRepository.findByIdAndUserId(inventoryEntryId, userId)
                .orElseThrow(() -> new InventoryEntryNotFoundException("Inventory entry not found: " + inventoryEntryId));
    }

    /**
     * Atomic "eat it": ownership check + FOOD-category check + feed the
     * pet (PetService.feedPet, the same hunger/mood math the old free
     * Feed button used) + delete the inventory row, all in one
     * transaction — either every step happens or none does, so a
     * failed feed never silently burns the food, and a failed delete
     * never lets the same entry be dropped-and-fed twice.
     * <p>
     * Ownership is enforced the same way every other per-entry
     * operation in this codebase is (requireOwnedEntry) — another
     * user's inventory entry id behaves as "not found", never
     * "forbidden".
     */
    @Transactional
    public Pet consumeFood(String userId, Long inventoryEntryId) {
        InventoryEntry entry = requireOwnedEntry(userId, inventoryEntryId);

        if (entry.getItem().getCategory() != ItemCategory.FOOD) {
            throw new InventoryItemNotFoodException(
                    "Inventory entry " + inventoryEntryId + " is not a food item");
        }

        Pet pet = petService.feedPet(userId);
        inventoryEntryRepository.delete(entry);

        return pet;
    }
}
