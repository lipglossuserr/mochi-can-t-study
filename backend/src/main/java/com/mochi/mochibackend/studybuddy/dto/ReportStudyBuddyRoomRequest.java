package com.mochi.mochibackend.studybuddy.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/** Body for {@code POST /api/study-buddy/queue/room} — see StudyBuddyEntry's class doc on the room hand-off. */
@Getter
@Setter
public class ReportStudyBuddyRoomRequest {

    @NotBlank(message = "roomId is required")
    private String roomId;
}
