package com.mochi.mochibackend.community.controller;

import com.mochi.mochibackend.community.dto.SearchResponse;
import com.mochi.mochibackend.community.service.SearchService;
import com.mochi.mochibackend.dto.ApiResponse;
import com.mochi.mochibackend.exception.InvalidFirebaseTokenException;
import com.mochi.mochibackend.security.FirebaseAuthenticationToken;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The {@code /api/communities/{slug}/search} contract — Community
 * Rooms, v2 backlog. Same translate-only-HTTP shape as every other
 * controller in this package; all the querying logic lives in
 * {@code SearchService}.
 */
@RestController
@RequestMapping("/api/communities/{slug}/search")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<SearchResponse>> search(
            @PathVariable String slug,
            @RequestParam("q") String query,
            @RequestParam(required = false) Integer limit) {
        SearchResponse response = searchService.search(currentUid(), slug, query, limit);
        return ResponseEntity.ok(ApiResponse.success("Search results retrieved", response));
    }

    /** Same pattern as every other controller in this package: the uid comes from the verified Firebase token. */
    private String currentUid() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication instanceof FirebaseAuthenticationToken firebaseAuthenticationToken)) {
            throw new InvalidFirebaseTokenException("Invalid or missing Firebase token");
        }

        return firebaseAuthenticationToken.getUid();
    }
}
