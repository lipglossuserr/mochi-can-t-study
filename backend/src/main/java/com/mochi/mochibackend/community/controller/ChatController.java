package com.mochi.mochibackend.community.controller;

import com.mochi.mochibackend.community.dto.ChatMessageResponse;
import com.mochi.mochibackend.community.dto.SendChatMessageRequest;
import com.mochi.mochibackend.community.service.ChatService;
import com.mochi.mochibackend.dto.ApiResponse;
import com.mochi.mochibackend.exception.InvalidFirebaseTokenException;
import com.mochi.mochibackend.security.FirebaseAuthenticationToken;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The {@code /api/communities/{slug}/chat} contract — the free,
 * Spring-hosted replacement for the Cloud-Function-based chat send
 * path (see {@code ChatService}'s javadoc for why). Same translate-
 * only-HTTP shape as every other controller in this package; reading
 * chat is unaffected and still goes straight to Firestore from the
 * client, so there's no corresponding GET here.
 */
@RestController
@RequestMapping("/api/communities/{slug}/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping("/messages")
    public ResponseEntity<ApiResponse<ChatMessageResponse>> send(
            @PathVariable String slug, @Valid @RequestBody SendChatMessageRequest request) {
        String messageId = chatService.sendMessage(currentUid(), slug, request.getBody());
        return ResponseEntity.ok(ApiResponse.success("Message sent", new ChatMessageResponse(messageId)));
    }

    /** Same pattern as every other controller in this package: the uid comes from the verified Firebase token. */
    private String currentUid() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication instanceof FirebaseAuthenticationToken firebaseAuthenticationToken)) {
            throw new InvalidFirebaseTokenException("Invalid or missing Firebase token");
        }

        return firebaseAuthenticationToken.getUid();
    }
}
