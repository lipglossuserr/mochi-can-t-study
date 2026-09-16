package com.mochi.mochibackend.flashcard.service;

import com.mochi.mochibackend.exception.FlashcardDeckNotFoundException;
import com.mochi.mochibackend.flashcard.dto.FlashcardDeckDetailResponse;
import com.mochi.mochibackend.flashcard.dto.FlashcardDeckSummaryResponse;
import com.mochi.mochibackend.flashcard.entity.Flashcard;
import com.mochi.mochibackend.flashcard.entity.FlashcardDeck;
import com.mochi.mochibackend.flashcard.enums.DeckMode;
import com.mochi.mochibackend.flashcard.enums.Difficulty;
import com.mochi.mochibackend.flashcard.enums.Focus;
import com.mochi.mochibackend.flashcard.mapper.FlashcardMapper;
import com.mochi.mochibackend.flashcard.repository.FlashcardDeckRepository;
import com.mochi.mochibackend.pet.entity.Pet;
import com.mochi.mochibackend.pet.service.PetService;
import com.mochi.mochibackend.pet.service.RewardService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;

/**
 * Upload -> extract -> AI-generate -> persist, plus deck CRUD and the
 * completion reward. Every read/mutation goes through
 * requireOwnedDeck, same ownership pattern as every other user-owned
 * entity here. DTO mapping happens INSIDE each @Transactional method
 * (never in the controller after return) — see FlashcardDeck's doc
 * comment for why that's load-bearing with open-in-view=false.
 */
@Service
public class FlashcardDeckService {

    private static final int MIN_CARDS = 5;
    private static final int MAX_CARDS = 40;

    private final FlashcardDeckRepository repository;
    private final DocumentTextExtractor textExtractor;
    private final FlashcardGenerationService generationService;
    private final FlashcardMapper mapper;
    private final RewardService rewardService;
    private final PetService petService;

    public FlashcardDeckService(
            FlashcardDeckRepository repository,
            DocumentTextExtractor textExtractor,
            FlashcardGenerationService generationService,
            FlashcardMapper mapper,
            RewardService rewardService,
            PetService petService
    ) {
        this.repository = repository;
        this.textExtractor = textExtractor;
        this.generationService = generationService;
        this.mapper = mapper;
        this.rewardService = rewardService;
        this.petService = petService;
    }

    @Transactional
    public FlashcardDeckDetailResponse generate(
            String userId, MultipartFile file, DeckMode mode, Difficulty difficulty, Focus focus, int cardCount
    ) {
        int clampedCount = Math.max(MIN_CARDS, Math.min(MAX_CARDS, cardCount));
        String sourceText = textExtractor.extract(file);
        FlashcardGenerationService.GeneratedDeck generated =
                generationService.generate(sourceText, mode, difficulty, focus, clampedCount);

        FlashcardDeck deck = new FlashcardDeck();
        deck.setUserId(userId);
        deck.setTitle(titleFrom(file.getOriginalFilename()));
        deck.setSourceFileName(file.getOriginalFilename());
        deck.setMode(mode);
        deck.setDifficulty(difficulty);
        deck.setFocus(focus);
        deck.setAiSummary(generated.summary());

        int position = 0;
        for (FlashcardGenerationService.GeneratedCard card : generated.cards()) {
            Flashcard flashcard = new Flashcard();
            flashcard.setDeck(deck);
            flashcard.setPosition(position++);
            flashcard.setFront(card.front());
            flashcard.setBack(card.back());
            deck.getCards().add(flashcard);
        }

        FlashcardDeck saved = repository.save(deck);
        return mapper.toDetail(saved);
    }

    @Transactional(readOnly = true)
    public List<FlashcardDeckSummaryResponse> listForUser(String userId) {
        return repository.findAllByUserIdOrderByCreatedAtDesc(userId).stream().map(mapper::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public FlashcardDeckDetailResponse getOwned(String userId, Long deckId) {
        return mapper.toDetail(requireOwnedDeck(userId, deckId));
    }

    @Transactional
    public void delete(String userId, Long deckId) {
        repository.delete(requireOwnedDeck(userId, deckId));
    }

    /** Idempotent, same pattern as TaskService#complete — only the one real transition into completed=true grants XP/coins. */
    @Transactional
    public Pet complete(String userId, Long deckId) {
        FlashcardDeck deck = requireOwnedDeck(userId, deckId);

        if (deck.isCompleted()) {
            return petService.getPet(userId);
        }

        int cardCount = deck.getCards().size();
        deck.setCompleted(true);
        deck.setCompletedAt(Instant.now());
        repository.save(deck);

        return rewardService.applyFlashcardDeckCompletionReward(userId, cardCount);
    }

    private FlashcardDeck requireOwnedDeck(String userId, Long deckId) {
        return repository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> new FlashcardDeckNotFoundException("Flashcard deck not found: " + deckId));
    }

    private String titleFrom(String filename) {
        if (filename == null || filename.isBlank()) return "Study Deck";
        int dot = filename.lastIndexOf('.');
        String base = dot > 0 ? filename.substring(0, dot) : filename;
        return base.replace('_', ' ').replace('-', ' ').strip();
    }
}