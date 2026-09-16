package com.mochi.mochibackend.video.controller;

import com.mochi.mochibackend.dto.ApiResponse;
import com.mochi.mochibackend.exception.InvalidFirebaseTokenException;
import com.mochi.mochibackend.security.FirebaseAuthenticationToken;
import com.mochi.mochibackend.video.dto.RoomModerationLogEntryResponse;
import com.mochi.mochibackend.video.entity.RoomModerationLogEntry;
import com.mochi.mochibackend.video.mapper.RoomModerationLogMapper;
import com.mochi.mochibackend.video.service.RoomModerationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The room-scoped counterpart to {@link RoomModerationController} — a
 * separate controller (rather than another mapping there) because this
 * endpoint isn't nested under {@code /participants/{identity}}, it's
 * one level up at the room itself. Host-only, same authorization rule
 * {@code RoomModerationService}'s LiveKit-backed actions already use
 * (see that service's {@code getModerationLog}).
 */
@RestController
@RequestMapping("/api/video/rooms/{roomId}/moderation-log")
public class RoomModerationLogController {

    private final RoomModerationService moderationService;
    private final RoomModerationLogMapper mapper;

    public RoomModerationLogController(RoomModerationService moderationService, RoomModerationLogMapper mapper) {
        this.moderationService = moderationService;
        this.mapper = mapper;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<RoomModerationLogEntryResponse>>> getModerationLog(
            @PathVariable String roomId
    ) {
        List<RoomModerationLogEntry> entries = moderationService.getModerationLog(roomId, currentUid());
        return ResponseEntity.ok(ApiResponse.success(
                "Moderation log retrieved", entries.stream().map(mapper::toResponse).toList()));
    }

    /** Same pattern as RoomModerationController#currentUid. */
    private String currentUid() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication instanceof FirebaseAuthenticationToken firebaseAuthenticationToken)) {
            throw new InvalidFirebaseTokenException("Invalid or missing Firebase token");
        }

        return firebaseAuthenticationToken.getUid();
    }
}
