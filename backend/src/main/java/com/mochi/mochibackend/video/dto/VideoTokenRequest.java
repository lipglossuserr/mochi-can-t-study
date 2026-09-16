package com.mochi.mochibackend.video.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Body for {@code POST /api/video/rooms/{roomId}/token} — Study Rooms
 * Phase 3. {@code identity} is deliberately NOT accepted here: the
 * LiveKit participant identity is always the authenticated Firebase
 * uid, resolved server-side, the same trust boundary every other
 * mutating endpoint in this codebase uses (see
 * {@code StudySessionController#currentUid}). Only the cosmetic display
 * name is client-supplied.
 */
@Getter
@Setter
@NoArgsConstructor
public class VideoTokenRequest {

    @Size(max = 60, message = "Display name must be at most 60 characters")
    private String displayName;
}
