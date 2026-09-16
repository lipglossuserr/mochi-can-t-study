package com.mochi.mochibackend.flashcard.enums;

/** Which kind of flashcard Mochi generates — see FlashcardGenerationService for how each shapes the AI prompt. */
public enum DeckMode {
    KEY_CONCEPT,
    QA,
    DEFINITION,
    EXAM_PREP,
    FORMULA
}