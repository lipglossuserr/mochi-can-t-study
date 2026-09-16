package com.mochi.mochibackend.video.dto;

import com.mochi.mochibackend.video.enums.TrackType;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * Body for POST /api/video/rooms/{roomId}/participants/{identity}/mute.
 * <p>
 * {@code trackType} defaults to {@code AUDIO} when omitted, so existing
 * callers built before {@code muteParticipant} learned to also target
 * {@code VIDEO} (the "turn off camera" action) keep working unchanged.
 */
@Getter
@Setter
public class MuteParticipantRequest {

    @NotNull(message = "muted is required")
    private Boolean muted;

    private TrackType trackType = TrackType.AUDIO;
}
