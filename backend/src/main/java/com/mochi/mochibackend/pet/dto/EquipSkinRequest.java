package com.mochi.mochibackend.pet.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * Request payload for {@code PATCH /api/pet/skin}. Ownership (or
 * being the free default) is checked server-side by
 * {@code PetService#equipSkin} — this DTO only carries the requested
 * {@code itemKey} across the wire.
 */
@Getter
@Setter
public class EquipSkinRequest {

    @NotBlank(message = "itemKey is required")
    private String itemKey;
}
