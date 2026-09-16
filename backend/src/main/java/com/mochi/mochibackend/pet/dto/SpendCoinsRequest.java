package com.mochi.mochibackend.pet.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * Request payload for {@code POST /api/pet/coins/spend}.
 * <p>
 * Deliberately generic: this endpoint knows nothing about a Shop item
 * catalog, prices, or names — it only ever validates and deducts an
 * amount of coins. The Shop's catalog (items, prices, images) lives
 * entirely on the frontend for this sprint, same as the "no inventory
 * yet" scope earlier sprints established; the backend's only job is to
 * keep the coin balance honest and race-safe, the same way
 * {@code StartSessionRequest} enforces its own rule independently of
 * whatever the client believes.
 */
@Getter
@Setter
public class SpendCoinsRequest {

    @NotNull(message = "Amount is required")
    @Min(value = 1, message = "Amount must be at least 1 coin")
    private Integer amount;

    /**
     * Optional, purely descriptive (e.g. "Tuna Treat") — surfaced back
     * in nothing server-side today, but accepted so the frontend can
     * send it now without a breaking change later if the backend ever
     * wants to log/attribute spends.
     */
    private String reason;
}