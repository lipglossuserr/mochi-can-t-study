package com.mochi.mochibackend.firebase;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import org.springframework.stereotype.Component;

/**
 * Thin wrapper around Firebase Admin SDK token verification.
 * <p>
 * This is the single place in the codebase that calls
 * {@link FirebaseAuth#verifyIdToken(String)}. It contains no business
 * logic — it only verifies a raw ID token and returns the decoded token,
 * or lets {@link FirebaseAuthException} propagate on failure (invalid
 * signature, expired token, malformed token, wrong audience/issuer, etc.).
 */
@Component
public class FirebaseTokenVerifier {

    public FirebaseToken verify(String idToken) throws FirebaseAuthException {
        return FirebaseAuth.getInstance().verifyIdToken(idToken);
    }

}
