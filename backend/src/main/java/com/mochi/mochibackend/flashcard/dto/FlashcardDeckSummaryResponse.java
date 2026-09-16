package com.mochi.mochibackend.flashcard.dto;

import java.time.Instant;

/** One row in the deck library — no cards, just enough to render DeckCard. */
public record FlashcardDeckSummaryResponse(
        Long id,
        String title,
        String sourceFileName,
        String mode,
        String difficulty,
        String focus,
        int cardCount,
        boolean completed,
        Instant createdAt
) {
}