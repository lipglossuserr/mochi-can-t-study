package com.mochi.mochibackend.video.repository;

import com.mochi.mochibackend.video.entity.RoomModerationLogEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoomModerationLogRepository extends JpaRepository<RoomModerationLogEntry, Long> {

    /** A room's full moderation timeline, most recent first — backs the host-only review panel (see RoomModerationLogEntry's class doc). */
    List<RoomModerationLogEntry> findByRoomIdOrderByCreatedAtDesc(String roomId);
}
