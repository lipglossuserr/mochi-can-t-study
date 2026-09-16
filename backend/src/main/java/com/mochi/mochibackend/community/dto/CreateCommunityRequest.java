package com.mochi.mochibackend.community.dto;

import com.mochi.mochibackend.community.enums.CommunityVisibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Request payload for {@code POST /api/communities}.
 * <p>
 * {@code slug} is optional — when omitted, {@code CommunityService}
 * derives one from {@code name} (lowercased, non-alphanumeric collapsed
 * to hyphens, de-duplicated on collision). Supplying one lets a creator
 * pin a short, memorable URL (e.g. "iut") instead of whatever falls out
 * of the full name. {@code visibility} defaults to PUBLIC when omitted —
 * the friendlier default for a study-help community.
 */
@Getter
@Setter
public class CreateCommunityRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 100, message = "Name must be at most 100 characters")
    private String name;

    @Size(max = 500, message = "Description must be at most 500 characters")
    private String description;

    @Pattern(regexp = "^[a-z0-9]+(-[a-z0-9]+)*$", message = "Slug must be lowercase letters, numbers, and hyphens only")
    @Size(max = 64, message = "Slug must be at most 64 characters")
    private String slug;

    private CommunityVisibility visibility;

    @Size(max = 255, message = "Icon URL must be at most 255 characters")
    private String iconUrl;
}
