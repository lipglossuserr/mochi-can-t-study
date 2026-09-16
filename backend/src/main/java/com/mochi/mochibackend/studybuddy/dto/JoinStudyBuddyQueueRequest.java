package com.mochi.mochibackend.studybuddy.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class JoinStudyBuddyQueueRequest {

    @NotBlank(message = "subject is required")
    @Size(max = 200, message = "subject must be 200 characters or fewer")
    private String subject;
}
