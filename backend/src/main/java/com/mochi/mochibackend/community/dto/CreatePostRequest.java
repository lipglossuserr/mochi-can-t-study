package com.mochi.mochibackend.community.dto;

import com.mochi.mochibackend.community.enums.PostType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.List;

/**
 * Request payload for {@code POST /api/communities/{slug}/posts}. One
 * shape for all four {@link PostType}s rather than four request
 * classes — which fields are required depends on {@code type} and is
 * validated in {@code PostService.create} (e.g. {@code pollOptions} for
 * POLL, {@code studyRoomCode} for ROOM_SHARE), since Bean Validation
 * annotations can't easily express "required only when type == X."
 */
@Getter
@Setter
public class CreatePostRequest {

    @NotNull(message = "Post type is required")
    private PostType type;

    @NotNull(message = "Title is required")
    @Size(min = 1, max = 200, message = "Title must be between 1 and 200 characters")
    private String title;

    @Size(max = 2000, message = "Body must be at most 2000 characters")
    private String body;

    /**
     * Named {@code anonymous} (not {@code isAnonymous}) deliberately —
     * a boolean field literally prefixed {@code is} gets a Lombok
     * getter of {@code isAnonymous()} but a setter of
     * {@code setAnonymous()}, and Jackson resolves the JSON property
     * from the setter, so the wire property ends up {@code "anonymous"}
     * either way. Naming the field to match avoids that mismatch being
     * invisible at the call site.
     */
    private boolean anonymous;

    /** ROOM_SHARE only. */
    @Size(max = 64, message = "Study room code must be at most 64 characters")
    private String studyRoomCode;

    /** ROOM_SHARE only; optional. */
    private Instant studyRoomExpiresAt;

    /** POLL only — 2 to 10 option labels, in display order. */
    private List<@Size(max = 120, message = "Each poll option must be at most 120 characters") String> pollOptions;
}
