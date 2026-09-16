package com.mochi.mochibackend.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Application-side representation of a user.
 * <p>
 * Identity itself (password, credentials, provider info) belongs to
 * Firebase Authentication and is never stored here beyond
 * {@code provider}, which is kept as a lightweight record of which
 * Firebase sign-in method was used. This model only carries what the
 * backend needs for its own purposes: the Firebase uid as a foreign key
 * back to identity, and application data such as the username and
 * preferences.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {

    private String uid;
    private String username;
    private String email;
    private Instant createdAt;
    private Map<String, Object> preferences = new HashMap<>();

    /**
     * Which Firebase provider this user authenticated with.
     * <p>
     * Not yet populated by any code path — no provider-detection logic
     * has been implemented. This field only exists so the data has
     * somewhere to live once that logic is added.
     */
    private AuthProvider provider;

}
