package com.mochi.mochibackend.community.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Request payload for {@code POST /api/communities/{slug}/blog}. Always
 * creates a DRAFT — publishing is a separate, explicit action
 * ({@code POST .../{blogId}/publish}), so a half-written post is never
 * one accidental submit away from going live.
 */
@Getter
@Setter
public class CreateBlogPostRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must be at most 200 characters")
    private String title;

    @Size(max = 500, message = "Cover image URL must be at most 500 characters")
    private String coverImageUrl;

    @NotBlank(message = "Body is required")
    private String body;
}
