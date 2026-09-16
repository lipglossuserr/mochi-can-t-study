package com.mochi.mochibackend.security;

import com.google.firebase.auth.FirebaseToken;
import com.mochi.mochibackend.firebase.FirebaseTokenVerifier;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Extracts a Firebase ID token from the {@code Authorization} header,
 * verifies it via {@link FirebaseTokenVerifier}, and — on success —
 * populates the {@link SecurityContextHolder} with a
 * {@link FirebaseAuthenticationToken}.
 * <p>
 * Requests without a {@code Bearer} token are simply passed through
 * unauthenticated. Verification failures are also passed through
 * unauthenticated rather than rejected here — this filter never crashes
 * the application and never itself decides access; that decision is left
 * to Spring Security's authorization rules, which currently
 * {@code permitAll()} while this foundation is being put in place.
 */
@Component
public class FirebaseAuthenticationFilter extends OncePerRequestFilter {

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    private final FirebaseTokenVerifier firebaseTokenVerifier;

    public FirebaseAuthenticationFilter(FirebaseTokenVerifier firebaseTokenVerifier) {
        this.firebaseTokenVerifier = firebaseTokenVerifier;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                     @NonNull HttpServletResponse response,
                                     @NonNull FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader(AUTHORIZATION_HEADER);

        if (header != null && header.startsWith(BEARER_PREFIX)) {
            String idToken = header.substring(BEARER_PREFIX.length());

            try {
                FirebaseToken decodedToken = firebaseTokenVerifier.verify(idToken);
                FirebaseAuthenticationToken authentication = new FirebaseAuthenticationToken(decodedToken);
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (Exception ex) {
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }

}
