package com.mochi.mochibackend.shop.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * Request payload for {@code POST /api/shop/purchase}. Unlike
 * {@code SpendCoinsRequest} (which knows only an amount, because food
 * has no catalog on the backend), this endpoint takes an actual catalog
 * {@code itemId} — the price is looked up server-side from the
 * {@code Item} row, never trusted from the client, so there's no
 * {@code amount} field here to spoof.
 */
@Getter
@Setter
public class PurchaseRequest {

    @NotNull(message = "Item id is required")
    private Long itemId;
}
