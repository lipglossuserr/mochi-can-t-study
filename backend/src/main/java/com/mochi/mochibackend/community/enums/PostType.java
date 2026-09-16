package com.mochi.mochibackend.community.enums;

/**
 * The four short-form post kinds a community member can create — the
 * original core loop from the Community Rooms design doc, before the
 * blog layer or chat.
 * <p>
 * Each type shares the same {@code Post} row shape; type-specific
 * fields simply go unused for the types that don't need them:
 * {@code ROOM_SHARE} uses {@code studyRoomCode}/{@code studyRoomExpiresAt},
 * {@code HELP_REQUEST} uses {@code isResolved}, {@code POLL} owns a set
 * of {@code PollOption} rows. {@code VENT} uses none of the extras —
 * title/body/author is the whole post, deliberately, since vents are
 * the highest abuse-risk surface per the design doc and don't need
 * extra affordances that could amplify them.
 */
public enum PostType {
    ROOM_SHARE,
    HELP_REQUEST,
    VENT,
    POLL
}
