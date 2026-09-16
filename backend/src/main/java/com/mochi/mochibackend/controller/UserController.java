package com.mochi.mochibackend.controller;

import com.mochi.mochibackend.dto.ApiResponse;
import com.mochi.mochibackend.dto.UserResponse;
import com.mochi.mochibackend.exception.InvalidFirebaseTokenException;
import com.mochi.mochibackend.security.FirebaseAuthenticationToken;
import com.mochi.mochibackend.service.AuthService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The {@code /api/users} contract.
 * <p>
 * {@code /me} returns the profile of the currently authenticated caller,
 * resolved from the {@link FirebaseAuthenticationToken} placed in the
 * security context by {@code FirebaseAuthenticationFilter}.
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final AuthService authService;

    public UserController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/me")
    public ApiResponse<UserResponse> me() {
        // TODO(Sprint 2.x): once SecurityConfig protects /api/users/** with
        // .authenticated() + CustomAuthenticationEntryPoint, this manual check
        // becomes redundant with Spring Security's own 401 handling and can be
        // removed — Security will reject unauthenticated requests before they
        // ever reach this method.
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication instanceof FirebaseAuthenticationToken firebaseAuthenticationToken)) {
            throw new InvalidFirebaseTokenException("Invalid or missing Firebase token");
        }

        UserResponse userResponse = authService.getCurrentUser(firebaseAuthenticationToken.getUid());
        return ApiResponse.success("OK", userResponse);
    }

}
