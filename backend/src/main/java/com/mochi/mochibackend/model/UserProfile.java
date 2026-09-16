package com.mochi.mochibackend.model;

import com.google.cloud.Timestamp;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A user's persisted Mochi profile, stored in Firestore at
 * {@code users/{uid}}.
 * <p>
 * Populated only from Firebase-verified identity data (uid, email,
 * display name) plus server-assigned timestamps — never from
 * client-supplied request bodies. Requires a public no-arg constructor
 * and public getters/setters so the Firestore SDK can (de)serialize it
 * automatically via {@code DocumentSnapshot#toObject(UserProfile.class)}.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserProfile {

    private String uid;
    private String email;
    private String displayName;
    private Timestamp createdAt;
    private Timestamp lastLogin;

}
