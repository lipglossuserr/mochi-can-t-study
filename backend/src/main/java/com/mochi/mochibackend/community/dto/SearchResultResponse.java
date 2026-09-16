package com.mochi.mochibackend.community.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * One search hit — deliberately lighter than {@code PostResponse}/
 * {@code BlogPostResponse}: a search results list needs a title and a
 * short snippet, not full poll options, vote state, or a complete
 * body. Reusing the full mappers would mean an extra poll-options/
 * caller-vote lookup per post just to throw the result away unused.
 * {@code postType} is only set for {@code type == "POST"} (mirrors
 * {@code PostResponse.type}); null for a blog-post hit.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SearchResultResponse {

    /** "POST" or "BLOG_POST". */
    private String type;
    private Long id;
    private String title;
    /** Short plain-text excerpt around/from the match — see {@code SearchService.snippetOf}. */
    private String snippet;
    /** Set only when {@code type == "POST"} — e.g. "VENT", "POLL". Null for a blog-post hit. */
    private String postType;
    private Instant createdAt;
}
