package com.mochi.mochibackend.flashcard.service;

import com.mochi.mochibackend.exception.FlashcardGenerationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

/** Calls Groq's OpenAI-compatible Chat Completions API. Configured via mochi.ai.openai.api-key / mochi.ai.openai.model in application.properties. */
@Component
public class OpenAiFlashcardGenerationClient implements FlashcardGenerationClient {

    private static final Logger log = LoggerFactory.getLogger(OpenAiFlashcardGenerationClient.class);

    private final RestClient restClient;
    private final String apiKey;
    private final String model;

    public OpenAiFlashcardGenerationClient(
            @Value("${mochi.ai.openai.api-key:}") String apiKey,
            @Value("${mochi.ai.openai.model:llama-3.3-70b-versatile}") String model
    ) {
        this.apiKey = apiKey;
        this.model = model;
        this.restClient = RestClient.builder().baseUrl("https://api.groq.com/openai/v1").build();
    }

    @Override
    @SuppressWarnings("unchecked")
    public String generate(String systemPrompt, String userPrompt) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new FlashcardGenerationException(
                    "AI flashcard generation isn't configured yet — set mochi.ai.openai.api-key in application.properties.");
        }

        Map<String, Object> body = Map.of(
                "model", model,
                "response_format", Map.of("type", "json_object"),
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)
                )
        );

        try {
            Map<String, Object> response = restClient.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            if (response == null) {
                throw new FlashcardGenerationException("Mochi got an empty response from the AI — please try again.");
            }
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            return (String) message.get("content");

        } catch (HttpClientErrorException.Unauthorized e) {
            log.error("Groq rejected the API key (401)", e);
            throw new FlashcardGenerationException(
                    "Mochi's AI key looks invalid — check GROQ_API_KEY and restart the backend.");

        } catch (HttpClientErrorException.TooManyRequests e) {
            log.error("Groq rate-limited (429)", e);
            throw new FlashcardGenerationException(
                    "Mochi's AI is rate-limited right now — wait a bit and try again.");

        } catch (ResourceAccessException e) {
            log.error("Could not reach Groq (network/timeout)", e);
            throw new FlashcardGenerationException(
                    "Mochi couldn't reach the AI — check your internet connection and try again.");

        } catch (RestClientException | ClassCastException | NullPointerException | IndexOutOfBoundsException e) {
            log.error("Unexpected failure calling Groq", e);
            throw new FlashcardGenerationException("Mochi couldn't reach the AI right now — please try again in a moment.");
        }
    }
}