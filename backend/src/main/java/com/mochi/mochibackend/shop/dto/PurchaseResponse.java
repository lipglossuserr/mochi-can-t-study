package com.mochi.mochibackend.shop.dto;

import com.mochi.mochibackend.inventory.dto.InventoryEntryResponse;
import com.mochi.mochibackend.pet.dto.PetResponse;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Response for a successful purchase: the new inventory row (freshly
 * owned, not yet placed) plus the pet's updated coin balance in the
 * same payload — sparing the frontend a second {@code GET /api/pet}
 * round trip just to refresh the coin display after a buy, the same
 * "everything the UI needs from one call" convenience
 * {@code PetController.spendCoins} already gives the old food flow.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseResponse {

    private InventoryEntryResponse inventoryEntry;
    private PetResponse pet;
}
