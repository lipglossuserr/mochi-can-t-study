package com.mochi.mochibackend.video.mapper;

import com.mochi.mochibackend.video.dto.RoomModerationLogEntryResponse;
import com.mochi.mochibackend.video.entity.RoomModerationLogEntry;
import org.springframework.stereotype.Component;

/** Entity -> DTO mapping for moderation log entries. Same shape as {@code ReportMapper} in the community package. */
@Component
public class RoomModerationLogMapper {

    public RoomModerationLogEntryResponse toResponse(RoomModerationLogEntry entry) {
        return new RoomModerationLogEntryResponse(
                entry.getId(),
                entry.getActorUid(),
                entry.getTargetUid(),
                entry.getAction().name(),
                entry.getTrackType() != null ? entry.getTrackType().name() : null,
                entry.getReason(),
                entry.getCreatedAt()
        );
    }
}
