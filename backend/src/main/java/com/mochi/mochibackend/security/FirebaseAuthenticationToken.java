package com.mochi.mochibackend.security;

import com.google.firebase.auth.FirebaseToken;
import org.springframework.security.authentication.AbstractAuthenticationToken;

import java.util.Collections;

/**
 * Spring Security {@link org.springframework.security.core.Authentication}
 * representing a caller whose Firebase ID token has been verified.
 * <p>
 * Stores the uid, email, and decoded Firebase claims — nothing else. No
 * password is ever stored here, since Firebase never gives the backend
 * one. No {@link org.springframework.security.core.GrantedAuthority}s are
 * populated yet; role/claims-based authorization is out of scope for this
 * sprint.
 */
public class FirebaseAuthenticationToken extends AbstractAuthenticationToken {

    private final String uid;
    private final String email;
    private final FirebaseToken decodedToken;

    public FirebaseAuthenticationToken(FirebaseToken decodedToken) {
        super(Collections.emptyList());
        this.decodedToken = decodedToken;
        this.uid = decodedToken.getUid();
        this.email = decodedToken.getEmail();
        setAuthenticated(true);
    }

    @Override
    public Object getCredentials() {
        return null;
    }

    @Override
    public Object getPrincipal() {
        return uid;
    }

    public String getUid() {
        return uid;
    }

    public String getEmail() {
        return email;
    }

    public FirebaseToken getDecodedToken() {
        return decodedToken;
    }

}
