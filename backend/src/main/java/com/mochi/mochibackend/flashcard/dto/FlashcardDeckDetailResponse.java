package com.mochi.mochibackend.flashcard.dto;

import java.time.Instant;
import java.util.List;

/** Full deck with every card — what FlashcardViewer studies from. */
public record FlashcardDeckDetailResponse(
        Long id,
        String title,
        String sourceFileName,
        String mode,
        String difficulty,
        String focus,
        String aiSummary,
        boolean completed,
        Instant createdAt,
        List<FlashcardResponse> cards
) {
}