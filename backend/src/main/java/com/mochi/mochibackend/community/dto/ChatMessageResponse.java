package com.mochi.mochibackend.community.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Response for a successful chat send — just the Firestore-assigned message id; the client's own `onSnapshot` subscription is what actually renders the new message, this is only a send-confirmation. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageResponse {

    private String messageId;
}
