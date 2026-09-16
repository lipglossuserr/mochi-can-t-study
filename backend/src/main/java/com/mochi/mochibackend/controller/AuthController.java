package com.mochi.mochibackend.controller;

import com.mochi.mochibackend.dto.ApiResponse;
import com.mochi.mochibackend.dto.RegisterRequest;
import com.mochi.mochibackend.dto.UserResponse;
import com.mochi.mochibackend.exception.InvalidFirebaseTokenException;
import com.mochi.mochibackend.security.FirebaseAuthenticationToken;
import com.mochi.mochibackend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The {@code /api/auth} contract.
 * <p>
 * {@code /register} provisions a backend user record for an already
 * Firebase-authenticated caller — it does not create Firebase credentials
 * and never receives a password.
 * <p>
 * There is no login endpoint here, and there never will be: per the
 * Sprint 1.5 architecture decision, login is handled entirely by the
 * Firebase client SDK. Spring Boot must never authenticate users with
 * email/password.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserResponse>> register(@Valid @RequestBody RegisterRequest request) {
        // TODO(Sprint 2.x): once SecurityConfig protects /api/users/** (and this
        // endpoint, if appropriate) with .authenticated() + CustomAuthenticationEntryPoint,
        // this manual check becomes redundant with Spring Security's own 401 handling
        // and can be removed — Security will reject unauthenticated requests before
        // they ever reach this method.
        FirebaseAuthenticationToken firebaseUser = requireAuthenticatedFirebaseUser();

        // displayName is preferably the Firebase-verified name (populated for
        // providers like Google Sign-In). Email/password sign-ups have no
        // Firebase display name at all, so we fall back to the username the
        // caller chose at registration — application data, not identity data,
        // so trusting it here does not violate "never trust uid/email from
        // the frontend."
        String displayName = firebaseUser.getDecodedToken().getName();
        if (displayName == null || displayName.isBlank()) {
            displayName = request.getUsername();
        }

        UserResponse userResponse = authService.registerOrGetUser(
                firebaseUser.getUid(),
                firebaseUser.getEmail(),
                displayName
        );

        return ResponseEntity.ok(ApiResponse.success("User registered", userResponse));
    }

    private FirebaseAuthenticationToken requireAuthenticatedFirebaseUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication instanceof FirebaseAuthenticationToken firebaseAuthenticationToken)) {
            throw new InvalidFirebaseTokenException("Invalid or missing Firebase token");
        }

        return firebaseAuthenticationToken;
    }

}
