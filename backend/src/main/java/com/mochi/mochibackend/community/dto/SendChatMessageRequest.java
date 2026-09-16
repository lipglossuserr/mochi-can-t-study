package com.mochi.mochibackend.community.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/** Request payload for {@code POST /api/communities/{slug}/chat/messages}. */
@Getter
@Setter
public class SendChatMessageRequest {

    @NotBlank(message = "Message can't be empty")
    @Size(max = 2000, message = "Message can't exceed 2000 characters")
    private String body;
}
