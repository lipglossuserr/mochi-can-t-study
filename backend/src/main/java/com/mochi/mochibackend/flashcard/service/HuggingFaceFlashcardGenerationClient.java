// backend/src/main/java/com/mochi/mochibackend/flashcard/service/HuggingFaceFlashcardGenerationClient.java
package com.mochi.mochibackend.flashcard.service;

import com.mochi.mochibackend.exception.FlashcardGenerationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

/**
 * Calls Hugging Face's Inference Providers router — a free, hosted,
 * OpenAI-compatible chat-completions endpoint that fans out to whichever
 * partner (Together, Groq, Novita, Fireworks, ...) is hosting the model.
 * Nothing runs locally; this is a plain HTTPS call.
 *
 * Configured via mochi.ai.huggingface.api-key / mochi.ai.huggingface.model
 * in application.properties. Marked @Primary so this bean wins over
 * OpenAiFlashcardGenerationClient (Groq) — remove @Primary here (or delete
 * that class) to switch back to Groq instead.
 */
@Component
@Primary
public class HuggingFaceFlashcardGenerationClient implements FlashcardGenerationClient {

    private static final Logger log = LoggerFactory.getLogger(HuggingFaceFlashcardGenerationClient.class);

    private final RestClient restClient;
    private final String apiKey;
    private final String model;

    public HuggingFaceFlashcardGenerationClient(
            @Value("${mochi.ai.huggingface.api-key:}") String apiKey,
            @Value("${mochi.ai.huggingface.model:meta-llama/Llama-3.1-8B-Instruct}") String model
    ) {
        this.apiKey = apiKey;
        this.model = model;
        this.restClient = RestClient.builder().baseUrl("https://router.huggingface.co/v1").build();
    }

    @Override
    @SuppressWarnings("unchecked")
    public String generate(String systemPrompt, String userPrompt) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new FlashcardGenerationException(
                    "AI flashcard generation isn't configured yet — set mochi.ai.huggingface.api-key (HF_TOKEN) in application.properties.");
        }

        Map<String, Object> body = Map.of(
                "model", model,
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
            log.error("Hugging Face rejected the token (401)", e);
            throw new FlashcardGenerationException(
                    "Mochi's Hugging Face token looks invalid — check HF_TOKEN and restart the backend.");

        } catch (HttpClientErrorException.TooManyRequests e) {
            log.error("Hugging Face rate-limited (429)", e);
            throw new FlashcardGenerationException(
                    "Mochi's AI is rate-limited right now — wait a bit and try again.");

        } catch (HttpClientErrorException e) {
            if (e.getStatusCode().value() == 402) {
                log.error("Hugging Face monthly free credits exhausted (402)", e);
                throw new FlashcardGenerationException(
                        "Mochi's Hugging Face free credits for this month are used up — try again next month, or pin a different :provider in mochi.ai.huggingface.model.");
            }
            log.error("Hugging Face rejected the request ({})", e.getStatusCode(), e);
            throw new FlashcardGenerationException("Mochi couldn't reach the AI right now — please try again in a moment.");

        } catch (ResourceAccessException e) {
            log.error("Could not reach Hugging Face (network/timeout)", e);
            throw new FlashcardGenerationException(
                    "Mochi couldn't reach the AI — check your internet connection and try again.");

        } catch (RestClientException | ClassCastException | NullPointerException | IndexOutOfBoundsException e) {
            log.error("Unexpected failure calling Hugging Face", e);
            throw new FlashcardGenerationException("Mochi couldn't reach the AI right now — please try again in a moment.");
        }
    }
}