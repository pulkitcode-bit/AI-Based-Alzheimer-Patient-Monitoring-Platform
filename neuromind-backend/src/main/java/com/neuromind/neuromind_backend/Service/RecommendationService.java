package com.neuromind.neuromind_backend.Service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final PatientProgressService patientProgressService;
    private static final String ML_API_URL = "http://localhost:5000/recommend/";

    public Map<String, Object> getRecommendations(Long patientId) {
        try {
            // Previously this only ever called the ML service with a plain GET
            // and no data, which meant its cold-start branch fired on every
            // single request regardless of how many sessions the patient
            // actually had — the dashboard's "AI Personalized" recommendation
            // was never based on real performance. This computes the
            // patient's real per-domain averages and POSTs them, so the
            // engine can target whichever domain is genuinely weakest.
            Map<String, Double> domainScores = patientProgressService.getDomainScores(patientId);

            String url = ML_API_URL + patientId;
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, Object> requestBody = Map.of("domain_scores", domainScores);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            @SuppressWarnings("unchecked")
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            Map<String, Object> responseBody = response.getBody();

            if (responseBody != null && responseBody.containsKey("data")) {
                @SuppressWarnings("unchecked")
                Map<String, Object> data = (Map<String, Object>) responseBody.get("data");
                return data;
            }
            return responseBody;
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("error", "Unable to reach Recommendation Engine");
            fallback.put("recommended_activity", "Trail Making A");
            fallback.put("category", "Processing Speed");
            fallback.put("difficulty", "Medium");
            fallback.put("reason", "Fallback recommendation due to ML service unavailability.");
            fallback.put("suggested_duration_minutes", 1);
            fallback.put("confidence", 0.5);
            fallback.put("caregiver_alert", false);
            return fallback;
        }
    }
}
