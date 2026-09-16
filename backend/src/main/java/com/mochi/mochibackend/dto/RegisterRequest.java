package com.mochi.mochibackend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Request payload for {@code POST /api/auth/register}.
 * <p>
 * Only carries {@code username}. The caller's identity (uid, email) comes
 * from the verified Firebase ID token, not from this body — the backend
 * never receives a password or email/uid here, since Firebase already
 * owns that information.
 */
@Getter
@Setter
public class RegisterRequest {

    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 30, message = "Username must be between 3 and 30 characters")
    private String username;

}
