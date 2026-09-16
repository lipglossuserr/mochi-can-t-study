package com.mochi.mochibackend.flashcard.service;

/**
 * Sends a prompt to whichever AI provider is configured and returns
 * its raw text response. Kept deliberately dumb (no JSON parsing here
 * — that's FlashcardGenerationService's job) so a different provider
 * (Anthropic, Gemini, a local model) can be swapped in later by
 * implementing only this one method and marking it @Primary.
 */
public interface FlashcardGenerationClient {
    String generate(String systemPrompt, String userPrompt);
}