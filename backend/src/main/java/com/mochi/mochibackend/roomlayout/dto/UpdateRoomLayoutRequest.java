package com.mochi.mochibackend.roomlayout.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * Request payload for {@code PATCH /api/room-layout/{id}} — repositioning
 * an already-placed item. The frontend debounces drag events client-side
 * (see the plan: "debounced client-side, not fired per-pixel"), so this
 * fires once per drag gesture, not per pointer-move. {@code x}/{@code y}
 * are required every call (the new resting position); {@code zIndex}/
 * {@code rotation} are optional and only updated when present, so a
 * plain reposition doesn't have to resend depth/rotation it isn't
 * changing.
 */
@Getter
@Setter
public class UpdateRoomLayoutRequest {

    @NotNull(message = "x is required")
    private Double x;

    @NotNull(message = "y is required")
    private Double y;

    private Integer zIndex;

    private Double rotation;
}
