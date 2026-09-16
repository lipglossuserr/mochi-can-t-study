package com.mochi.mochibackend.flashcard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mochi.mochibackend.exception.FlashcardGenerationException;
import com.mochi.mochibackend.flashcard.enums.DeckMode;
import com.mochi.mochibackend.flashcard.enums.Difficulty;
import com.mochi.mochibackend.flashcard.enums.Focus;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/** Builds the mode/difficulty/focus-aware prompt, calls FlashcardGenerationClient, and parses its JSON response into structured cards. */
@Service
public class FlashcardGenerationService {

    private final FlashcardGenerationClient client;
    private final ObjectMapper objectMapper;

    public FlashcardGenerationService(FlashcardGenerationClient client, ObjectMapper objectMapper) {
        this.client = client;
        this.objectMapper = objectMapper;
    }

    public record GeneratedCard(String front, String back) {
    }

    public record GeneratedDeck(String summary, List<GeneratedCard> cards) {
    }

    public GeneratedDeck generate(String sourceText, DeckMode mode, Difficulty difficulty, Focus focus, int cardCount) {
        String systemPrompt = """
                You are Mochi, a friendly study assistant that turns study material into flashcards.
                Always respond with ONLY a single JSON object, no markdown fences, no commentary, in exactly this shape:
                {"summary": "a short 2-4 sentence overview of the material", "cards": [{"front": "...", "back": "..."}]}
                Generate exactly %d flashcards.
                """.formatted(cardCount);

        String modeInstruction = switch (mode) {
            case KEY_CONCEPT -> "Each card's front is a key concept or term from the material; the back explains it clearly.";
            case QA -> "Each card's front is a question about the material; the back is the answer.";
            case DEFINITION -> "Each card's front is a term; the back is its precise definition.";
            case EXAM_PREP -> "Each card's front is an exam-style prompt (e.g. 'Explain...', 'Compare...'); the back is a model exam answer.";
            case FORMULA -> "Each card's front names a formula or equation from the material; the back gives the formula itself and a one-line explanation of its variables.";
        };

        String difficultyInstruction = switch (difficulty) {
            case EASY -> "Keep cards simple and foundational.";
            case MEDIUM -> "Cards should be moderately challenging, suitable for solid exam prep.";
            case HARD -> "Cards should be challenging, testing deep understanding and edge cases.";
        };

        String focusInstruction = focus == Focus.IMPORTANT_TOPICS_ONLY
                ? "Focus only on the most important topics and skip minor details."
                : "Cover the entire document reasonably evenly.";

        String userPrompt = """
                %s
                %s
                %s

                STUDY MATERIAL:
                %s
                """.formatted(modeInstruction, difficultyInstruction, focusInstruction, sourceText);

        String raw = client.generate(systemPrompt, userPrompt);

        try {
            JsonNode root = objectMapper.readTree(stripCodeFences(raw));
            String summary = root.path("summary").asText("");
            List<GeneratedCard> cards = new ArrayList<>();
            for (JsonNode cardNode : root.path("cards")) {
                String front = cardNode.path("front").asText("").strip();
                String back = cardNode.path("back").asText("").strip();
                if (!front.isEmpty() && !back.isEmpty()) {
                    cards.add(new GeneratedCard(front, back));
                }
            }
            if (cards.isEmpty()) {
                throw new FlashcardGenerationException("Mochi generated an empty deck — please try again.");
            }
            // The requested count is a ceiling, not a promise the AI keeps
            // exactly — some models slightly over-generate.
            List<GeneratedCard> capped = cards.size() > cardCount ? cards.subList(0, cardCount) : cards;
            return new GeneratedDeck(summary, capped);
        } catch (JsonProcessingException e) {
            throw new FlashcardGenerationException("Mochi had trouble turning that into flashcards — please try again.");
        }
    }

    /** Some models wrap JSON in ```json fences despite instructions not to — strip defensively rather than failing generation over formatting. */
    private String stripCodeFences(String raw) {
        String trimmed = raw.strip();
        if (trimmed.startsWith("```")) {
            trimmed = trimmed.replaceFirst("^```[a-zA-Z]*\\n", "");
            if (trimmed.endsWith("```")) {
                trimmed = trimmed.substring(0, trimmed.length() - 3);
            }
        }
        return trimmed.strip();
    }
}