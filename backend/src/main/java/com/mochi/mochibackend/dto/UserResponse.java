package com.mochi.mochibackend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Representation of a user returned by the API.
 * <p>
 * Intentionally excludes the password. DTO only — no logic.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private String uid;
    private String username;
    private String email;
    private Instant createdAt;

}
