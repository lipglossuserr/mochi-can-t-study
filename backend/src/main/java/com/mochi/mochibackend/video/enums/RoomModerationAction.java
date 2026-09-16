package com.mochi.mochibackend.video.enums;

/**
 * What kind of moderation event a {@code RoomModerationLogEntry} row
 * records. Covers both the host-only LiveKit actions
 * ({@link RoomModerationService} already performs {@code MUTE}/
 * {@code UNMUTE}/{@code REMOVE}) and {@code REPORT}, which isn't a
 * host action at all — any participant can report another — but
 * belongs in the same durable, inspectable timeline for a room rather
 * than a separate table, since "who reported whom, and did the host
 * ever act on it" is one story a reviewer wants to read in order.
 * <p>
 * {@code trackType} on the entity distinguishes an audio mute from a
 * video mute for {@code MUTE}/{@code UNMUTE} rows; it's left null for
 * {@code REMOVE} and {@code REPORT}, which aren't track-scoped.
 */
public enum RoomModerationAction {
    MUTE,
    UNMUTE,
    REMOVE,
    REPORT
}
