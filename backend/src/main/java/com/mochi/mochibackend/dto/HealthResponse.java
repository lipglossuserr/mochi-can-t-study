package com.mochi.mochibackend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Payload carried by the health-check endpoint's {@link ApiResponse}.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class HealthResponse {

    private String status;
    private String application;

}
