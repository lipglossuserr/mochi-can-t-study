package com.mochi.mochibackend.community.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * Combined search results — kept as two separate lists rather than one
 * merged/ranked list, because MySQL's FULLTEXT relevance score from
 * one {@code MATCH ... AGAINST} isn't comparable to another's across
 * different corpora (posts vs. blog posts); forcing them into one
 * ordering would be false precision. The frontend renders two labeled
 * sections instead.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SearchResponse {

    private List<SearchResultResponse> posts;
    private List<SearchResultResponse> blogPosts;
}
