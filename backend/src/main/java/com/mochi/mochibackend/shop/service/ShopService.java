package com.mochi.mochibackend.shop.service;

import com.mochi.mochibackend.inventory.entity.InventoryEntry;
import com.mochi.mochibackend.inventory.repository.InventoryEntryRepository;
import com.mochi.mochibackend.item.entity.Item;
import com.mochi.mochibackend.item.service.ItemService;
import com.mochi.mochibackend.pet.entity.Pet;
import com.mochi.mochibackend.pet.service.PetService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The furniture/toy/decoration purchase flow: atomic afford-check + coin
 * deduct + grant inventory row, all server-side — the same pattern
 * {@code PetService.spendCoins} already established for the old
 * amount-only endpoint, just recording ownership this time instead of
 * discarding what was bought.
 * <p>
 * Deliberately a separate service from both {@code PetService} and
 * {@code InventoryService} rather than bolted onto either: it
 * orchestrates across three tables (catalog, coins, ownership) the way
 * {@code DailyGoalService.recordStudyMinutes} orchestrates across
 * study-session completion and daily-goal progress, without becoming
 * "the" owner of any of them. Reusing {@code PetService.spendCoins}
 * directly (rather than reimplementing the affordability check here)
 * means the two coin-spending paths — old food flow and new furniture
 * flow — can never drift out of sync on what "can't afford it" means.
 * Both this method and {@code spendCoins} are {@code @Transactional},
 * so — same default propagation Spring gives every {@code @Transactional}
 * call chain in this codebase — the coin deduction and the new
 * inventory row commit or roll back together.
 */
@Service
public class ShopService {

    private final ItemService itemService;
    private final PetService petService;
    private final InventoryEntryRepository inventoryEntryRepository;

    public ShopService(ItemService itemService, PetService petService, InventoryEntryRepository inventoryEntryRepository) {
        this.itemService = itemService;
        this.petService = petService;
        this.inventoryEntryRepository = inventoryEntryRepository;
    }

    /**
     * @return the pet (with updated coin balance) and the newly granted
     * inventory row, in that call order — coins are deducted first, so
     * an {@code InsufficientCoinsException} always leaves the user with
     * no partial/phantom inventory row.
     */
    @Transactional
    public Purchase purchase(String userId, Long itemId) {
        Item item = itemService.getById(itemId);

        Pet pet = petService.spendCoins(userId, item.getPrice());

        InventoryEntry entry = new InventoryEntry();
        entry.setUserId(userId);
        entry.setItem(item);
        entry = inventoryEntryRepository.save(entry);

        return new Purchase(pet, entry);
    }

    /** Small carrier for the two things a purchase produces — not exposed directly, {@code ShopController} maps it to {@code PurchaseResponse}. */
    public record Purchase(Pet pet, InventoryEntry inventoryEntry) {
    }
}
