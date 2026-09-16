package com.mochi.mochibackend.video.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Public view of a {@code RoomModerationLogEntry} — the host-only review panel's row shape. Entities are never exposed from controllers, matching {@code ReportResponse}'s convention in the community package. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RoomModerationLogEntryResponse {

    private Long id;
    private String actorUid;
    private String targetUid;
    private String action;
    /** Null for REMOVE/REPORT rows — see {@code RoomModerationLogEntry}'s class doc. */
    private String trackType;
    /** Only set for REPORT rows. */
    private String reason;
    private Instant createdAt;
}
