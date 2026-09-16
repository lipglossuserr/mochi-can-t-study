package com.mochi.mochibackend.video.enums;

/**
 * Which published track a mute/unmute moderation action targets —
 * {@code AUDIO} for the original "quiet down" action, {@code VIDEO}
 * for "turn off camera". See {@code RoomModerationService#muteParticipant}.
 */
public enum TrackType {
    AUDIO,
    VIDEO
}
