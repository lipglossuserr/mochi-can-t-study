package com.mochi.mochibackend.flashcard.repository;

import com.mochi.mochibackend.flashcard.entity.FlashcardDeck;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FlashcardDeckRepository extends JpaRepository<FlashcardDeck, Long> {

    List<FlashcardDeck> findAllByUserIdOrderByCreatedAtDesc(String userId);

    /** Ownership-safe lookup: another user's deck id behaves as "not found". */
    Optional<FlashcardDeck> findByIdAndUserId(Long id, String userId);
}