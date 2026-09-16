package com.mochi.mochibackend.flashcard.mapper;

import com.mochi.mochibackend.flashcard.dto.FlashcardDeckDetailResponse;
import com.mochi.mochibackend.flashcard.dto.FlashcardDeckSummaryResponse;
import com.mochi.mochibackend.flashcard.dto.FlashcardResponse;
import com.mochi.mochibackend.flashcard.entity.FlashcardDeck;
import org.springframework.stereotype.Component;

/**
 * Entity -> DTO mapping. Both methods touch the LAZY `cards`
 * collection, so both must only ever be called from inside an open
 * @Transactional method — see FlashcardDeck's own doc comment.
 */
@Component
public class FlashcardMapper {

    public FlashcardDeckSummaryResponse toSummary(FlashcardDeck deck) {
        return new FlashcardDeckSummaryResponse(
                deck.getId(),
                deck.getTitle(),
                deck.getSourceFileName(),
                deck.getMode().name(),
                deck.getDifficulty().name(),
                deck.getFocus().name(),
                deck.getCards().size(),
                deck.isCompleted(),
                deck.getCreatedAt()
        );
    }

    public FlashcardDeckDetailResponse toDetail(FlashcardDeck deck) {
        return new FlashcardDeckDetailResponse(
                deck.getId(),
                deck.getTitle(),
                deck.getSourceFileName(),
                deck.getMode().name(),
                deck.getDifficulty().name(),
                deck.getFocus().name(),
                deck.getAiSummary(),
                deck.isCompleted(),
                deck.getCreatedAt(),
                deck.getCards().stream()
                        .map(c -> new FlashcardResponse(c.getId(), c.getPosition(), c.getFront(), c.getBack()))
                        .toList()
        );
    }
}