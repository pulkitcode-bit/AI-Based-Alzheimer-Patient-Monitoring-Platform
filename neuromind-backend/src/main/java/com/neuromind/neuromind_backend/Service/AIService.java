package com.neuromind.neuromind_backend.Service;

import tools.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RequestCallback;
import org.springframework.web.client.ResponseExtractor;
import org.springframework.web.client.RestTemplate;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

@Service
public class AIService {

    private static final Logger log = LoggerFactory.getLogger(AIService.class);
    private static final String GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

    @Value("${groq.api.key}")
    private String groqApiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public String generateAIResponse(String userMessage) {
        if (groqApiKey == null || groqApiKey.isEmpty()) {
            log.error("Groq API key is not configured. Check groq.api.key in application.properties or GROQ_API_KEY env var.");
            return "AI service is not properly configured. Please contact your administrator.";
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + groqApiKey);

            // Build OpenAI-compatible request body for Groq
            Map<String, Object> requestBody = Map.of(
                "model", "openai/gpt-oss-120b",
                "messages", List.of(
                    Map.of("role", "system", "content",
                        "You are NeuroMind AI, an empathetic, patient, and cheerful assistant for Alzheimer's patients. " +
                        "Keep your responses short, supportive, and clear. Avoid complex sentences."),
                    Map.of("role", "user", "content", userMessage)
                ),
                "temperature", 0.7,
                "max_completion_tokens", 300,
                "top_p", 1,
                "stream", false
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(GROQ_API_URL, request, Map.class);

            return extractContentFromResponse(response.getBody());
        } catch (HttpClientErrorException e) {
            log.error("Groq API HTTP Error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            return "I'm having a little trouble connecting right now, let's try again in a moment.";
        } catch (Exception e) {
            log.error("Groq API unexpected error: {}", e.getMessage(), e);
            return "I'm having a little trouble connecting right now, let's try again in a moment.";
        }
    }

    /**
     * Streaming variant of {@link #generateAIResponse(String)}. Calls
     * {@code onToken} once per delta as Groq's SSE stream arrives, instead of
     * blocking until the full completion is ready. Uses RestTemplate.execute
     * with a raw ResponseExtractor rather than postForEntity, because
     * postForEntity buffers the entire response body before returning it —
     * the opposite of what streaming needs.
     */
    public void streamAIResponse(String userMessage, Consumer<String> onToken) {
        if (groqApiKey == null || groqApiKey.isEmpty()) {
            log.error("Groq API key is not configured. Check groq.api.key in application.properties or GROQ_API_KEY env var.");
            onToken.accept("AI service is not properly configured. Please contact your administrator.");
            return;
        }

        Map<String, Object> requestBody = Map.of(
            "model", "openai/gpt-oss-120b",
            "messages", List.of(
                Map.of("role", "system", "content",
                    "You are NeuroMind AI, an empathetic, patient, and cheerful assistant for Alzheimer's patients. " +
                    "Keep your responses short, supportive, and clear. Avoid complex sentences."),
                Map.of("role", "user", "content", userMessage)
            ),
            "temperature", 0.7,
            "max_completion_tokens", 300,
            "top_p", 1,
            "stream", true
        );

        ObjectMapper mapper = new ObjectMapper();

        RequestCallback requestCallback = request -> {
            request.getHeaders().setContentType(MediaType.APPLICATION_JSON);
            request.getHeaders().set("Authorization", "Bearer " + groqApiKey);
            mapper.writeValue(request.getBody(), requestBody);
        };

        // Groq's streaming completions follow the OpenAI SSE convention:
        // repeated "data: {json}\n\n" lines, terminated by "data: [DONE]".
        // HttpURLConnection (RestTemplate's default factory) hands back the
        // response's InputStream live rather than buffering it, so reading
        // line-by-line here genuinely streams as bytes arrive on the socket.
        ResponseExtractor<Void> responseExtractor = response -> {
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(response.getBody(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (!line.startsWith("data:")) continue;
                    String payload = line.substring(5).trim();
                    if (payload.isEmpty() || payload.equals("[DONE]")) continue;

                    try {
                        Map<?, ?> chunk = mapper.readValue(payload, Map.class);
                        List<?> choices = (List<?>) chunk.get("choices");
                        if (choices == null || choices.isEmpty()) continue;
                        Map<?, ?> delta = (Map<?, ?>) ((Map<?, ?>) choices.get(0)).get("delta");
                        Object content = delta != null ? delta.get("content") : null;
                        if (content instanceof String s && !s.isEmpty()) {
                            onToken.accept(s);
                        }
                    } catch (Exception parseErr) {
                        log.warn("Skipping malformed SSE chunk from Groq: {}", payload);
                    }
                }
            }
            return null;
        };

        try {
            restTemplate.execute(GROQ_API_URL, HttpMethod.POST, requestCallback, responseExtractor);
        } catch (Exception e) {
            log.error("Groq streaming error: {}", e.getMessage(), e);
            onToken.accept("I'm having a little trouble connecting right now, let's try again in a moment.");
        }
    }

    @SuppressWarnings("unchecked")
    private String extractContentFromResponse(Map<String, Object> responseBody) {
        try {
            if (responseBody != null && responseBody.containsKey("choices")) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
                if (!choices.isEmpty()) {
                    Map<String, Object> firstChoice = choices.get(0);
                    Map<String, Object> message = (Map<String, Object>) firstChoice.get("message");
                    if (message != null && message.containsKey("content")) {
                        return (String) message.get("content");
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error parsing Groq API response: {}", e.getMessage(), e);
        }
        return "I'm sorry, I couldn't understand that.";
    }
}
