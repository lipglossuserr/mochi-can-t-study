package com.mochi.mochibackend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;


@Getter
@Setter
public class FocusBatchRequest {


    @NotBlank(message = "clientBatchId is required")
    @Size(max = 64)
    private String clientBatchId;


    @NotNull(message = "windowStartedAt is required")
    private Instant windowStartedAt;


    @NotNull(message = "windowEndedAt is required")
    private Instant windowEndedAt;



    @PositiveOrZero
    private long focusedMilliseconds;


    @PositiveOrZero
    private long distractedMilliseconds;


    @PositiveOrZero
    private long noFaceMilliseconds;


    @PositiveOrZero
    private long multipleFaceMilliseconds;


    @PositiveOrZero
    private long cameraUnavailableMilliseconds;


    // NEW FROM MOCHI CONFIGURED

    @PositiveOrZero
    private long phoneMilliseconds;


    @PositiveOrZero
    private long drowsyMilliseconds;

}