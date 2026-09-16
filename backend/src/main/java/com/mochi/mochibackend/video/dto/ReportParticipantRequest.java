package com.mochi.mochibackend.video.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Body for {@code POST /api/video/rooms/{roomId}/participants/{identity}/report}.
 * Mirrors {@code RoomReportInput.reason} on the frontend — this endpoint
 * durably persists the same report the client also writes straight to
 * Firestore's {@code reports} collection (see {@code roomRepository.ts}'s
 * {@code submitReport}); it's a second write, not a replacement, since
 * nothing here queries or deletes the Firestore copy.
 */
@Getter
@Setter
@NoArgsConstructor
public class ReportParticipantRequest {

    @NotBlank(message = "reason is required")
    @Size(max = 500, message = "reason must be at most 500 characters")
    private String reason;
}
