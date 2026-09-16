package com.mochi.mochibackend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Standard response envelope for every API endpoint.
 * <p>
 * Two small static factory methods are provided ({@link #success} and
 * {@link #error}) purely to avoid duplicating the "set timestamp, set
 * success flag" boilerplate at every call site across controllers and the
 * exception handler. No other behavior is implemented.
 *
 * @param <T> the type of the payload carried in {@code data}
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {

    private boolean success;
    private String message;
    private T data;
    private Instant timestamp;

    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, data, Instant.now());
    }

    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, message, null, Instant.now());
    }

}
