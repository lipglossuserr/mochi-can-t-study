package com.mochi.mochibackend.pet.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * Request payload for {@code POST /api/pet/public-batch}. Capped at 20
 * — this exists to render a handful of presence tiles (a co-study
 * room's participant list), never for bulk directory lookups.
 */
@Getter
@Setter
public class PublicPetBatchRequest {

    @NotEmpty(message = "uids is required")
    @Size(max = 20, message = "At most 20 uids per request")
    private List<String> uids;
}
